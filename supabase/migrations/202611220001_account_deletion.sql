-- Migration: 202611220001_account_deletion.sql
-- Description: Let an account be deleted without leaving the delete blocked by old references.
--
-- DELETE /v1/users/me removes the user's reviews, visits and Top 4 and then the
-- Supabase Auth user. Three early tables reference auth.users with the default
-- "no action" rule, so a single leftover row would make the auth delete fail.
-- Their references become "on delete set null": shared records (menus, product
-- evidence, audit trail) stay, but no longer point at a person.

alter table public.product_evidence
  drop constraint if exists product_evidence_reviewer_id_fkey,
  add constraint product_evidence_reviewer_id_fkey
    foreign key (reviewer_id) references auth.users(id) on delete set null;

alter table public.menus
  drop constraint if exists menus_owner_id_fkey,
  add constraint menus_owner_id_fkey
    foreign key (owner_id) references auth.users(id) on delete set null;

alter table public.audit_events
  drop constraint if exists audit_events_actor_id_fkey,
  add constraint audit_events_actor_id_fkey
    foreign key (actor_id) references auth.users(id) on delete set null;
