-- ============================================================
-- WARUNG POS — Seed data
-- Safe to re-run: every insert uses ON CONFLICT DO NOTHING.
-- ============================================================

-- ------------------------------------------------------------
-- Categories
-- ------------------------------------------------------------
insert into public.categories (name, description)
values
  ('Food', 'Main food and snacks'),
  ('Drink', 'Fresh drinks'),
  ('Snack', 'Light bites')
on conflict (name) do nothing;

-- ------------------------------------------------------------
-- Products
-- ------------------------------------------------------------
insert into public.products (name, description, category_id, price, cost_price, stock, is_available)
select v.name, v.description, c.id, v.price, v.cost_price, v.stock, v.is_available
from (values
  ('Es Teh Manis',     'Sweet iced tea',        'Drink', 5000,  2000, 100, true),
  ('Es Jeruk',         'Fresh iced orange',     'Drink', 7000,  3000, 100, true),
  ('Kopi Hitam',       'Black coffee',          'Drink', 8000,  3000, 100, true),
  ('Tahu Kocek Biasa', 'Original stuffed tofu', 'Food',  5000,  2500, 100, true),
  ('Tahu Kocek Mercon','Spicy stuffed tofu',    'Food',  7000,  3500, 100, true),
  ('Tahu Kocek Kerikil','Crunchy stuffed tofu', 'Food',  10000, 5000, 100, true),
  ('Tahu Walik',       'Inside-out fried tofu', 'Snack', 12000, 6000, 100, true)
) as v(name, description, category_name, price, cost_price, stock, is_available)
left join public.categories c on c.name = v.category_name
where not exists (
  select 1 from public.products where products.name = v.name
);

-- ------------------------------------------------------------
-- Shop settings
-- ------------------------------------------------------------
insert into public.shop_settings (id, shop_name, address, phone, receipt_footer)
values (1, 'Warung Cantik', 'Jl. Mawar No. 10, Jakarta', '0812-0000-0000', 'Thank you! ♡')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Demo accounts (passwords are for local/demo use — change them)
--   owner@warung.test   / owner123
--   cashier@warung.test / cashier123
-- The profile row is created automatically by the handle_new_user trigger.
-- Prefer creating real users from the Supabase Dashboard and assigning roles:
--   update public.profiles set role = 'owner' where id = '<user-uuid>';
-- ------------------------------------------------------------
do $$
declare
  v_owner_id uuid := '11111111-1111-1111-1111-111111111111';
  v_cashier_id uuid := '22222222-2222-2222-2222-222222222222';
begin
  if not exists (select 1 from auth.users where id = v_owner_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_owner_id, 'authenticated', 'authenticated',
      'owner@warung.test', crypt('owner123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Owner Warung","role":"owner"}',
      '', '', '', '',
      now(), now()
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_owner_id, v_owner_id::text,
      jsonb_build_object('sub', v_owner_id::text, 'email', 'owner@warung.test', 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict do nothing;
  end if;

  if not exists (select 1 from auth.users where id = v_cashier_id) then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change, email_change_token_new,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', v_cashier_id, 'authenticated', 'authenticated',
      'cashier@warung.test', crypt('cashier123', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Kasir Cantik","role":"cashier"}',
      '', '', '', '',
      now(), now()
    );

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_cashier_id, v_cashier_id::text,
      jsonb_build_object('sub', v_cashier_id::text, 'email', 'cashier@warung.test', 'email_verified', true),
      'email', now(), now(), now()
    )
    on conflict do nothing;
  end if;
end $$;

-- Fallback in case the trigger did not create the profile rows.
insert into public.profiles (id, full_name, role)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'full_name', split_part(u.email, '@', 1)),
       case when u.raw_user_meta_data ->> 'role' = 'owner' then 'owner'::user_role else 'cashier'::user_role end
from auth.users u
where u.email in ('owner@warung.test', 'cashier@warung.test')
  and not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Repair: Supabase Auth expects token columns to be '' and not NULL,
-- otherwise every login returns 500 "Database error querying schema".
-- Safe to re-run; skips columns that do not exist in this project.
-- ------------------------------------------------------------
do $$
declare
  col text;
begin
  foreach col in array array[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'reauthentication_token'
  ]
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = col
    ) then
      execute format(
        'update auth.users set %1$I = coalesce(%1$I, %2$L) where %1$I is null',
        col, ''
      );
    end if;
  end loop;
end $$;
