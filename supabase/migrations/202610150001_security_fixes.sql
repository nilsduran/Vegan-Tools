-- Migration: 202610150001_security_fixes.sql
-- Description: Security hardening for PostGIS spatial_ref_sys and restaurant_reviews RLS policies.

-- 1. PostGIS spatial_ref_sys:
-- Revoke mutation rights from anonymous and authenticated roles so that public users cannot modify coordinate systems.
grant select on table public.spatial_ref_sys to anon, authenticated;
revoke insert, update, delete, truncate on table public.spatial_ref_sys from anon, authenticated;

-- Attempt to enable RLS on spatial_ref_sys if role permits (silently ignore if managed by supabase_admin)
do $$
begin
  execute 'alter table public.spatial_ref_sys enable row level security';
  execute 'create policy "Allow public read-only access on spatial_ref_sys" on public.spatial_ref_sys for select using (true)';
exception
  when others then null;
end $$;

-- 2. Restaurant Reviews:
-- Harden RLS policies so users can ONLY insert, update or delete their OWN reviews (matching auth.uid()).
alter table public.restaurant_reviews enable row level security;

-- Drop insecure permissive policies
drop policy if exists "users can insert their own reviews" on public.restaurant_reviews;
drop policy if exists "users can update their own reviews" on public.restaurant_reviews;
drop policy if exists "users can delete their own reviews" on public.restaurant_reviews;
drop policy if exists "restaurant reviews are publicly readable" on public.restaurant_reviews;

-- Read is public
create policy "restaurant reviews are publicly readable"
  on public.restaurant_reviews for select
  using (true);

-- Insert requires authenticated user matching user_id
create policy "users can insert their own reviews"
  on public.restaurant_reviews for insert
  with check (auth.uid()::text = user_id or auth.role() = 'service_role');

-- Update requires review owner
create policy "users can update their own reviews"
  on public.restaurant_reviews for update
  using (auth.uid()::text = user_id or auth.role() = 'service_role')
  with check (auth.uid()::text = user_id or auth.role() = 'service_role');

-- Delete requires review owner
create policy "users can delete their own reviews"
  on public.restaurant_reviews for delete
  using (auth.uid()::text = user_id or auth.role() = 'service_role');
