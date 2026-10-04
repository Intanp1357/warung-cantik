-- ============================================================
-- WARUNG POS — idempotent checkout
-- A retried checkout (lost response, network hiccup, double tap)
-- must return the transaction that was already created instead of
-- creating a second one and decrementing stock twice.
-- ============================================================

alter table public.transactions
  add column if not exists client_reference uuid,
  add column if not exists request_fingerprint text;

-- One row per (client reference, submission): a different cart sent with the
-- same reference (user edited the cart) is a different submission.
create unique index if not exists transactions_idempotency_key
  on public.transactions (client_reference, request_fingerprint)
  where client_reference is not null;

-- The signature changes (new parameter + new return column), so the old
-- function has to be dropped — `create or replace` cannot change either.
drop function if exists public.create_transaction(jsonb, text, integer);

-- ------------------------------------------------------------
-- RPC: create an atomic transaction (server side is the source of truth)
--   p_items: [{"product_id": "uuid", "quantity": 2}, ...]
--   Prices, availability, stock and totals are re-read from the database.
--   p_client_reference: idempotency key sent by the client; a replay of the
--   same submission returns the first result without touching stock.
-- ------------------------------------------------------------
create or replace function public.create_transaction(
  p_items jsonb,
  p_payment_method text,
  p_payment_amount integer,
  p_client_reference uuid default null
)
returns table (new_id uuid, new_code text, new_item_count integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_total integer := 0;
  v_units integer := 0;
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_seq integer;
  v_code text;
  v_tx_id uuid;
  v_amount integer;
  v_change integer;
  v_fp text;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profile not found';
  end if;

  if p_payment_method not in ('cash', 'qris', 'transfer') then
    raise exception 'Invalid payment method';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_payment_amount is null or p_payment_amount < 0 then
    raise exception 'Invalid payment amount';
  end if;

  -- 0. Idempotency: canonical fingerprint of this submission
  --    (jsonb text is key-sorted, so key order cannot change it).
  if p_client_reference is not null then
    select md5(
      coalesce((
        select string_agg(elem::text, '|' order by elem ->> 'product_id')
        from jsonb_array_elements(p_items) elem
      ), '')
      || '|' || p_payment_method
      || '|' || p_payment_amount::text
    ) into v_fp;

    select t.id, t.transaction_code into v_tx_id, v_code
    from public.transactions t
    where t.client_reference = p_client_reference
      and t.request_fingerprint = v_fp;

    if v_tx_id is not null then
      -- Replay: return what was stored the first time, no stock movement.
      return query
        select v_tx_id, v_code, coalesce(sum(ti.quantity), 0)::integer
        from public.transaction_items ti
        where ti.transaction_id = v_tx_id;
      return;
    end if;
  end if;

  -- 1. Validate every line and build a trusted snapshot of prices.
  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce(v_item ->> 'quantity', '') = '' then
      raise exception 'Invalid quantity';
    end if;

    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 or v_qty > 999 then
      raise exception 'Invalid quantity';
    end if;

    select * into v_product from public.products where id = (v_item ->> 'product_id')::uuid;
    if not found then
      raise exception 'Product not found';
    end if;

    if not v_product.is_available then
      raise exception 'Product "%" is not available', v_product.name;
    end if;

    if v_product.stock is not null and v_product.stock < v_qty then
      raise exception 'Insufficient stock for "%"', v_product.name;
    end if;

    v_total := v_total + (v_product.price * v_qty);
    v_units := v_units + v_qty;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'price', v_product.price,
      'quantity', v_qty,
      'subtotal', v_product.price * v_qty
    );
  end loop;

  -- 2. Validate payment.
  if p_payment_method = 'cash' then
    if p_payment_amount < v_total then
      raise exception 'Payment amount is less than the total';
    end if;
    v_amount := p_payment_amount;
    v_change := p_payment_amount - v_total;
  else
    v_amount := v_total;
    v_change := 0;
  end if;

  -- 3. Unique human-readable code, e.g. TRX-20261004-001
  insert into public.transaction_code_counters (day, last_number)
  values (current_date, 1)
  on conflict (day) do update
    set last_number = public.transaction_code_counters.last_number + 1
  returning last_number into v_seq;

  v_code := 'TRX-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(v_seq::text, 3, '0');

  -- 4. Insert transaction + items, then decrement stock — all in one call.
  --    A concurrent retry of the very same submission loses the race here and
  --    falls through to the replay branch below.
  v_tx_id := null;

  insert into public.transactions (
    transaction_code, total_amount, payment_method, payment_amount,
    change_amount, status, created_by, client_reference, request_fingerprint
  )
  values (
    v_code, v_total, p_payment_method::payment_method, v_amount,
    v_change, 'completed', v_uid, p_client_reference, v_fp
  )
  on conflict (client_reference, request_fingerprint) where client_reference is not null
  do nothing
  returning public.transactions.id into v_tx_id;

  if v_tx_id is null then
    -- A conflict means this exact submission was already stored by a
    -- concurrent retry — look it up and return it instead.
    if p_client_reference is null then
      raise exception 'Checkout could not be completed';
    end if;

    select t.id, t.transaction_code into v_tx_id, v_code
    from public.transactions t
    where t.client_reference = p_client_reference
      and t.request_fingerprint = v_fp;

    if v_tx_id is null then
      raise exception 'Checkout could not be completed';
    end if;

    return query
      select v_tx_id, v_code, coalesce(sum(ti.quantity), 0)::integer
      from public.transaction_items ti
      where ti.transaction_id = v_tx_id;
    return;
  end if;

  for v_line in select * from jsonb_array_elements(v_lines) loop
    insert into public.transaction_items (transaction_id, product_id, product_name, quantity, price, subtotal)
    values (
      v_tx_id,
      (v_line ->> 'product_id')::uuid,
      v_line ->> 'product_name',
      (v_line ->> 'quantity')::integer,
      (v_line ->> 'price')::integer,
      (v_line ->> 'subtotal')::integer
    );

    update public.products
    set stock = case when stock is null then null else stock - (v_line ->> 'quantity')::integer end,
        updated_at = now()
    where id = (v_line ->> 'product_id')::uuid;
  end loop;

  return query select v_tx_id, v_code, v_units;
end;
$$;

revoke all on function public.create_transaction(jsonb, text, integer, uuid) from public;
grant execute on function public.create_transaction(jsonb, text, integer, uuid) to authenticated;
