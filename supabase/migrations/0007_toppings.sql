-- ============================================================
-- WARUNG POS — product toppings
-- Run AFTER 0001_schema.sql (0005/0006 first if you have them).
--
-- How it works:
--   * a category flagged `is_topping` holds the toppings (e.g. "Topping"),
--   * a product flagged `has_toppings` can be ordered with toppings,
--   * the cashier picks toppings in the POS; the choice is stored on the
--     product line (one line = product + its toppings), so the receipt and
--     the kitchen queue keep showing a single row per product.
-- Prices and stock are re-read server-side in `create_transaction`.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Flags
-- ------------------------------------------------------------
alter table public.categories
  add column if not exists is_topping boolean not null default false;

alter table public.products
  add column if not exists has_toppings boolean not null default false;

-- ------------------------------------------------------------
-- 2. Toppings recorded on the line they belong to
--    (product_name/price are snapshots, like on transaction_items)
-- ------------------------------------------------------------
create table if not exists public.transaction_item_toppings (
  id uuid primary key default gen_random_uuid(),
  transaction_item_id uuid not null references public.transaction_items (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null check (price >= 0),
  created_at timestamptz not null default now()
);

create index if not exists transaction_item_toppings_item_id_idx
  on public.transaction_item_toppings (transaction_item_id);

alter table public.transaction_item_toppings enable row level security;

drop policy if exists "transaction_item_toppings_select" on public.transaction_item_toppings;
create policy "transaction_item_toppings_select" on public.transaction_item_toppings
  for select to authenticated
  using (
    exists (
      select 1 from public.transaction_items ti
      where ti.id = transaction_item_id and public.is_staff()
    )
  );

-- No client INSERT/UPDATE policy on purpose: only the SECURITY DEFINER RPC
-- writes toppings, exactly like `transaction_items`.

-- ------------------------------------------------------------
-- 3. Idempotent checkout guards (same as 0006 — kept here so this file
--    also works on its own)
-- ------------------------------------------------------------
alter table public.transactions
  add column if not exists client_reference uuid,
  add column if not exists request_fingerprint text;

create unique index if not exists transactions_idempotency_key
  on public.transactions (client_reference, request_fingerprint)
  where client_reference is not null;

-- The signature/return shape changed twice since 0001 — make sure the old
-- 3-parameter variant is gone before (re)creating the current one.
drop function if exists public.create_transaction(jsonb, text, integer);

-- ------------------------------------------------------------
-- 4. RPC: create an atomic transaction (server side is the source of truth)
--   p_items: [
--     {"product_id": "uuid", "quantity": 2,
--      "toppings": [{"product_id": "uuid", "quantity": 1}]}
--   ]
--   Prices, availability, stock, toppings and totals are re-read from the
--   database; p_client_reference makes a retried submission a no-op.
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
  v_toppings jsonb;
  v_topping jsonb;
  v_topping_product public.products%rowtype;
  v_topping_qty integer;
  v_item_id uuid;
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
        select
          v_tx_id,
          v_code,
          (
            select coalesce(sum(ti.quantity), 0)::integer
            from public.transaction_items ti
            where ti.transaction_id = v_tx_id
          )
          +
          (
            select coalesce(sum(tip.quantity), 0)::integer
            from public.transaction_item_toppings tip
            join public.transaction_items ti on ti.id = tip.transaction_item_id
            where ti.transaction_id = v_tx_id
          );
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

    v_toppings := '[]'::jsonb;

    if v_item ? 'toppings' and jsonb_typeof(v_item -> 'toppings') = 'array' then
      if jsonb_array_length(v_item -> 'toppings') > 0 then
        if not v_product.has_toppings then
          raise exception 'Product "%" does not accept toppings', v_product.name;
        end if;

        for v_topping in select * from jsonb_array_elements(v_item -> 'toppings') loop
          v_topping_qty := (v_topping ->> 'quantity')::integer;
          if v_topping_qty is null or v_topping_qty <= 0 or v_topping_qty > 999 then
            raise exception 'Invalid topping quantity';
          end if;

          select * into v_topping_product
          from public.products
          where id = (v_topping ->> 'product_id')::uuid;

          if not found then
            raise exception 'Topping not found';
          end if;

          -- Only products of a topping category may be used as a topping.
          if not exists (
            select 1 from public.categories c
            where c.id = v_topping_product.category_id and c.is_topping
          ) then
            raise exception 'Product "%" is not a topping', v_topping_product.name;
          end if;

          if not v_topping_product.is_available then
            raise exception 'Topping "%" is not available', v_topping_product.name;
          end if;

          if v_topping_product.stock is not null and v_topping_product.stock < v_topping_qty then
            raise exception 'Insufficient stock for "%"', v_topping_product.name;
          end if;

          v_total := v_total + (v_topping_product.price * v_topping_qty);
          v_units := v_units + v_topping_qty;

          v_toppings := v_toppings || jsonb_build_object(
            'product_id', v_topping_product.id,
            'product_name', v_topping_product.name,
            'price', v_topping_product.price,
            'quantity', v_topping_qty
          );
        end loop;
      end if;
    elsif v_item ? 'toppings' and jsonb_typeof(v_item -> 'toppings') <> 'null' then
      raise exception 'Invalid toppings';
    end if;

    v_total := v_total + (v_product.price * v_qty);
    v_units := v_units + v_qty;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'price', v_product.price,
      'quantity', v_qty,
      'subtotal', v_product.price * v_qty,
      'toppings', v_toppings
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

  -- 4. Insert transaction + items + toppings, then decrement stock — one call.
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
      select
        v_tx_id,
        v_code,
        (
          select coalesce(sum(ti.quantity), 0)::integer
          from public.transaction_items ti
          where ti.transaction_id = v_tx_id
        )
        +
        (
          select coalesce(sum(tip.quantity), 0)::integer
          from public.transaction_item_toppings tip
          join public.transaction_items ti on ti.id = tip.transaction_item_id
          where ti.transaction_id = v_tx_id
        );
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
    )
    returning public.transaction_items.id into v_item_id;

    update public.products
    set stock = case when stock is null then null else stock - (v_line ->> 'quantity')::integer end,
        updated_at = now()
    where id = (v_line ->> 'product_id')::uuid;

    -- Toppings live on the line and move its own stock.
    for v_topping in
      select * from jsonb_array_elements(v_line -> 'toppings')
    loop
      insert into public.transaction_item_toppings (
        transaction_item_id, product_id, product_name, quantity, price
      )
      values (
        v_item_id,
        (v_topping ->> 'product_id')::uuid,
        v_topping ->> 'product_name',
        (v_topping ->> 'quantity')::integer,
        (v_topping ->> 'price')::integer
      );

      update public.products
      set stock = case when stock is null then null else stock - (v_topping ->> 'quantity')::integer end,
          updated_at = now()
      where id = (v_topping ->> 'product_id')::uuid;
    end loop;
  end loop;

  return query select v_tx_id, v_code, v_units;
end;
$$;

revoke all on function public.create_transaction(jsonb, text, integer, uuid) from public;
grant execute on function public.create_transaction(jsonb, text, integer, uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. RPC: queue status — topping stock moves with its product line
--    (cancelled = not served = stock returns to the products)
-- ------------------------------------------------------------
create or replace function public.set_queue_status(p_item_id uuid, p_status text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_item public.transaction_items%rowtype;
  v_was_sold boolean;
  v_now_sold boolean;
  v_stock integer;
  v_topping public.transaction_item_toppings%rowtype;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_staff() then
    raise exception 'Not authorized';
  end if;

  if p_status not in ('pending', 'done', 'cancelled') then
    raise exception 'Invalid queue status';
  end if;

  select * into v_item from public.transaction_items where id = p_item_id for update;
  if not found then
    raise exception 'Queue item not found';
  end if;

  v_was_sold := v_item.queue_status <> 'cancelled';
  v_now_sold := p_status <> 'cancelled';

  if v_was_sold <> v_now_sold then
    if v_item.product_id is not null then
      if v_now_sold then
        -- Restoring a cancelled item: stock must be available again.
        select stock into v_stock from public.products where id = v_item.product_id for update;

        if v_stock is not null and v_stock < v_item.quantity then
          raise exception 'Insufficient stock for "%"', v_item.product_name;
        end if;

        update public.products
        set stock = case when stock is null then null else stock - v_item.quantity end,
            updated_at = now()
        where id = v_item.product_id;
      else
        -- Cancelling: return the stock to the product.
        update public.products
        set stock = case when stock is null then null else stock + v_item.quantity end,
            updated_at = now()
        where id = v_item.product_id;
      end if;
    end if;

    -- Toppings follow the line (always after the product, same order everywhere).
    for v_topping in
      select * from public.transaction_item_toppings
      where transaction_item_id = p_item_id
      order by id
    loop
      if v_topping.product_id is null then
        continue;
      end if;

      if v_now_sold then
        select stock into v_stock from public.products where id = v_topping.product_id for update;

        if v_stock is not null and v_stock < v_topping.quantity then
          raise exception 'Insufficient stock for "%"', v_topping.product_name;
        end if;

        update public.products
        set stock = case when stock is null then null else stock - v_topping.quantity end,
            updated_at = now()
        where id = v_topping.product_id;
      else
        update public.products
        set stock = case when stock is null then null else stock + v_topping.quantity end,
            updated_at = now()
        where id = v_topping.product_id;
      end if;
    end loop;
  end if;

  update public.transaction_items
  set queue_status = p_status,
      resolved_at = case when p_status = 'pending' then null else now() end,
      resolved_by = case when p_status = 'pending' then null else v_uid end
  where id = p_item_id;

  return p_status;
end;
$$;

revoke all on function public.set_queue_status(uuid, text) from public;
grant execute on function public.set_queue_status(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 6. RPC: dashboard summary — toppings are sold products too, so they
--    count towards "products sold" (same shape as 0005, with toppings)
-- ------------------------------------------------------------
create or replace function public.dashboard_summary(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text,      -- 'hour' | 'weekday' | 'daynum'
  p_timezone text     -- e.g. 'Asia/Jakarta' — keeps buckets in shop time
)
returns jsonb
language sql
stable
security invoker
set search_path = public
as $$
  with tx as (
    select total_amount, created_at
    from public.transactions
    where created_at >= p_from and created_at <= p_to
  ),
  agg as (
    select
      coalesce(sum(total_amount), 0)::bigint as revenue,
      count(*)::bigint as transaction_count
    from tx
  ),
  item_agg as (
    select
      (
        select coalesce(sum(ti.quantity), 0)::bigint
        from public.transaction_items ti
        join public.transactions t on t.id = ti.transaction_id
        where t.created_at >= p_from and t.created_at <= p_to
      )
      +
      (
        select coalesce(sum(tip.quantity), 0)::bigint
        from public.transaction_item_toppings tip
        join public.transaction_items ti on ti.id = tip.transaction_item_id
        join public.transactions t on t.id = ti.transaction_id
        where t.created_at >= p_from and t.created_at <= p_to
      ) as items_sold
  ),
  buckets as (
    select
      case p_bucket
        when 'hour' then to_char(created_at at time zone p_timezone, 'YYYY-MM-DD HH24')
        else to_char(created_at at time zone p_timezone, 'YYYY-MM-DD')
      end as bucket_key,
      coalesce(sum(total_amount), 0)::bigint as value
    from tx
    group by 1
  ),
  points as (
    select
      case p_bucket
        when 'hour'
          then substring(bucket_key from 12 for 2)::int
        when 'weekday'
          then (substring(bucket_key from 1 for 10)::date
                - (p_from at time zone p_timezone)::date)::int
        else
          substring(bucket_key from 9 for 2)::int - 1
      end as idx,
      value
    from buckets
  )
  select jsonb_build_object(
    'revenue', (select revenue from agg),
    'transaction_count', (select transaction_count from agg),
    'items_sold', (select items_sold from item_agg),
    'average', case
      when (select transaction_count from agg) > 0
        then round(
          (select revenue from agg)::numeric / (select transaction_count from agg)
        )::bigint
      else 0
    end,
    'series', coalesce((
      select jsonb_agg(jsonb_build_object('index', idx, 'value', value) order by idx)
      from points
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.dashboard_summary(timestamptz, timestamptz, text, text) from public;
grant execute on function public.dashboard_summary(timestamptz, timestamptz, text, text) to authenticated;
