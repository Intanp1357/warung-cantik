-- ============================================================
-- WARUNG POS — Schema, RLS, and RPC
-- Run this file in the Supabase SQL Editor (or `supabase db push`).
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('owner', 'cashier');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash', 'qris', 'transfer');
  end if;
end $$;

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  role user_role not null default 'cashier',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_id uuid references public.categories (id) on delete set null,
  price integer not null check (price >= 0),
  cost_price integer not null default 0 check (cost_price >= 0),
  stock integer check (stock is null or stock >= 0),
  image_url text,
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_code text not null unique,
  total_amount integer not null check (total_amount >= 0),
  payment_method payment_method not null,
  payment_amount integer not null check (payment_amount >= 0),
  change_amount integer not null default 0 check (change_amount >= 0),
  status text not null default 'completed' check (status in ('completed', 'refunded')),
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create table if not exists public.transaction_items (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  price integer not null check (price >= 0),
  subtotal integer not null check (subtotal >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.shop_settings (
  id integer primary key default 1 check (id = 1),
  shop_name text not null default 'Warung Cantik',
  address text not null default '',
  phone text not null default '',
  receipt_footer text not null default 'Thank you! ♡',
  updated_at timestamptz not null default now()
);

-- Per-day transaction code sequence, guarantees unique TRX-YYYYMMDD-NNN codes.
create table if not exists public.transaction_code_counters (
  day date primary key,
  last_number integer not null default 0
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists transactions_created_at_idx on public.transactions (created_at desc);
create index if not exists transaction_items_transaction_id_idx on public.transaction_items (transaction_id);

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists set_shop_settings_updated_at on public.shop_settings;
create trigger set_shop_settings_updated_at
  before update on public.shop_settings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Profile auto-creation on signup
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when new.raw_user_meta_data ->> 'role' = 'owner' then 'owner'::user_role else 'cashier'::user_role end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Helper functions
-- ------------------------------------------------------------
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_items enable row level security;
alter table public.shop_settings enable row level security;
alter table public.transaction_code_counters enable row level security;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_owner())
  with check (id = auth.uid() or public.is_owner());

drop policy if exists "profiles_insert_owner" on public.profiles;
create policy "profiles_insert_owner" on public.profiles
  for insert to authenticated with check (public.is_owner());

drop policy if exists "categories_select" on public.categories;
create policy "categories_select" on public.categories
  for select to authenticated using (true);

drop policy if exists "categories_insert_owner" on public.categories;
create policy "categories_insert_owner" on public.categories
  for insert to authenticated with check (public.is_owner());

drop policy if exists "categories_update_owner" on public.categories;
create policy "categories_update_owner" on public.categories
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "categories_delete_owner" on public.categories;
create policy "categories_delete_owner" on public.categories
  for delete to authenticated using (public.is_owner());

drop policy if exists "products_select" on public.products;
create policy "products_select" on public.products
  for select to authenticated using (true);

drop policy if exists "products_insert_owner" on public.products;
create policy "products_insert_owner" on public.products
  for insert to authenticated with check (public.is_owner());

drop policy if exists "products_update_owner" on public.products;
create policy "products_update_owner" on public.products
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "products_delete_owner" on public.products;
create policy "products_delete_owner" on public.products
  for delete to authenticated using (public.is_owner());

-- Staff can read history; only the SECURITY DEFINER RPC writes transactions.
drop policy if exists "transactions_select" on public.transactions;
create policy "transactions_select" on public.transactions
  for select to authenticated using (public.is_staff());

drop policy if exists "transaction_items_select" on public.transaction_items;
create policy "transaction_items_select" on public.transaction_items
  for select to authenticated
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_id and public.is_staff()
    )
  );

drop policy if exists "shop_settings_select" on public.shop_settings;
create policy "shop_settings_select" on public.shop_settings
  for select to authenticated using (true);

drop policy if exists "shop_settings_update_owner" on public.shop_settings;
create policy "shop_settings_update_owner" on public.shop_settings
  for update to authenticated using (public.is_owner()) with check (public.is_owner());

drop policy if exists "shop_settings_insert_owner" on public.shop_settings;
create policy "shop_settings_insert_owner" on public.shop_settings
  for insert to authenticated with check (public.is_owner());

-- transaction_code_counters: no client policies on purpose (RPC only).

-- ------------------------------------------------------------
-- Storage: product images
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "product_images_read" on storage.objects;
create policy "product_images_read" on storage.objects
  for select to authenticated using (bucket_id = 'product-images');

drop policy if exists "product_images_insert_owner" on storage.objects;
create policy "product_images_insert_owner" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and public.is_owner());

drop policy if exists "product_images_update_owner" on storage.objects;
create policy "product_images_update_owner" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and public.is_owner());

drop policy if exists "product_images_delete_owner" on storage.objects;
create policy "product_images_delete_owner" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and public.is_owner());

-- ------------------------------------------------------------
-- RPC: create an atomic transaction (server side is the source of truth)
--   p_items: [{"product_id": "uuid", "quantity": 2}, ...]
--   Prices, availability, stock and totals are re-read from the database.
-- ------------------------------------------------------------
create or replace function public.create_transaction(
  p_items jsonb,
  p_payment_method text,
  p_payment_amount integer
)
returns table (new_id uuid, new_code text)
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
  v_lines jsonb := '[]'::jsonb;
  v_line jsonb;
  v_seq integer;
  v_code text;
  v_tx_id uuid;
  v_amount integer;
  v_change integer;
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
  insert into public.transactions (transaction_code, total_amount, payment_method, payment_amount, change_amount, status, created_by)
  values (v_code, v_total, p_payment_method::payment_method, v_amount, v_change, 'completed', v_uid)
  returning public.transactions.id into v_tx_id;

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

  return query select v_tx_id, v_code;
end;
$$;

revoke all on function public.create_transaction(jsonb, text, integer) from public;
grant execute on function public.create_transaction(jsonb, text, integer) to authenticated;
