-- Migration: 202611220002_usage_counters.sql
-- Description: Aggregate daily usage counters for the beta (apps/api/src/usage-counters.ts).
--
-- One row per day and metric, e.g. ("2026-11-22", "menus.cache.hit", 41).
-- No user ids, locations, searches or restaurant ids are ever stored here.
-- Only the API (service role) reads or writes: RLS is on with no public policy.

create table if not exists public.usage_counters (
  day date not null,
  metric text not null,
  count bigint not null default 0,
  primary key (day, metric)
);

alter table public.usage_counters enable row level security;

create or replace function public.increment_usage_counter(p_day date, p_metric text, p_amount bigint)
returns void
language sql
security invoker
set search_path = public
as $$
  insert into public.usage_counters (day, metric, count)
  values (p_day, p_metric, p_amount)
  on conflict (day, metric) do update set count = usage_counters.count + excluded.count;
$$;

revoke all on function public.increment_usage_counter(date, text, bigint) from public, anon, authenticated;
