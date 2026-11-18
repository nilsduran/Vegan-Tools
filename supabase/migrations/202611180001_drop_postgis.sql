-- Migration: 202611180001_drop_postgis.sql
-- Description: Remove PostGIS and btree_gist, which nothing uses.
--
-- PostGIS was installed in the public schema only for venues.location, a
-- geography column that was written but never queried: every distance and
-- map calculation uses venues.latitude / venues.longitude. Its table
-- public.spatial_ref_sys is owned by supabase_admin, so RLS cannot be enabled
-- on it, and the anon key could insert, update and delete its rows through the
-- Data API. That is the "rls_disabled_in_public" critical finding of the
-- Supabase Security Advisor (November 2026). Dropping the extension removes
-- the table. btree_gist had no use either (no exclusion constraints).
--
-- Deploy the API that no longer writes venues.location before running this.

drop index if exists public.idx_venues_location;
alter table public.venues drop column if exists location;

-- No cascade: if anything else still depends on these, fail loudly instead of
-- silently dropping it.
drop extension if exists postgis;
drop extension if exists btree_gist;
