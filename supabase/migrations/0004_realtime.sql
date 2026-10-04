-- ============================================================
-- WARUNG POS — live queue badge
-- Postgres changes are only broadcast for tables that live in the
-- supabase_realtime publication. Without this the navigation badge
-- only updates on a manual page refresh.
-- ============================================================

do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  )
  and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'transaction_items'
  ) then
    alter publication supabase_realtime add table public.transaction_items;
  end if;
end $$;
