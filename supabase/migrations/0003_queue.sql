-- ============================================================
-- WARUNG POS — Product queue (served / not served tracking)
-- Run AFTER 0001_schema.sql and 0002_seed.sql.
-- ============================================================

-- ------------------------------------------------------------
-- Queue columns on every transaction item
--   pending   -> not served yet (shows in the queue)
--   done      -> already served
--   cancelled -> not served on purpose (stock is returned)
-- ------------------------------------------------------------
alter table public.transaction_items
  add column if not exists queue_status text not null default 'pending',
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by uuid references public.profiles (id) on delete set null;

alter table public.transaction_items
  drop constraint if exists transaction_items_queue_status_check;

alter table public.transaction_items
  add constraint transaction_items_queue_status_check
  check (queue_status in ('pending', 'done', 'cancelled'));

create index if not exists transaction_items_queue_status_created_at_idx
  on public.transaction_items (queue_status, created_at);

-- ------------------------------------------------------------
-- RPC: change the queue status of one item.
-- Keeps stock in sync: a cancelled item is not sold, so its stock
-- returns to the product (and is taken again if it is restored).
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

  if v_was_sold <> v_now_sold and v_item.product_id is not null then
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
