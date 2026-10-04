-- ============================================================
-- WARUNG POS — aggregated dashboard summary
-- Computes revenue, transaction count, products sold, average
-- and the chart series inside Postgres. The app used to download
-- thousands of transaction rows to do this in JavaScript.
-- ============================================================

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
    select coalesce(sum(ti.quantity), 0)::bigint as items_sold
    from public.transaction_items ti
    join public.transactions t on t.id = ti.transaction_id
    where t.created_at >= p_from and t.created_at <= p_to
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
