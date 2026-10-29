-- Security hardening for all public tables introduced by the venue model.

alter table public.venue_events enable row level security;
alter table public.venue_external_mappings enable row level security;

drop policy if exists "venue events are readable by authenticated users"
  on public.venue_events;
create policy "venue events are readable by authenticated users"
  on public.venue_events for select
  to authenticated
  using (true);

drop policy if exists "venue mappings are publicly readable"
  on public.venue_external_mappings;
create policy "venue mappings are publicly readable"
  on public.venue_external_mappings for select
  to anon, authenticated
  using (is_blacklisted = false);

-- PostGIS creates this table in the public schema. Keep it read-only and
-- prevent anonymous or authenticated clients from changing its contents.
do $$
begin
  execute 'alter table public.spatial_ref_sys enable row level security';
  execute 'drop policy if exists "public spatial reference systems are readable" on public.spatial_ref_sys';
  execute 'create policy "public spatial reference systems are readable" on public.spatial_ref_sys for select to anon, authenticated using (true)';
exception
  when insufficient_privilege then
    raise warning 'Could not enable RLS on public.spatial_ref_sys; verify it in the Supabase security advisor';
end $$;

revoke insert, update, delete, truncate
  on table public.spatial_ref_sys
  from anon, authenticated;
