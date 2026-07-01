create extension if not exists pgcrypto;

create type public.diet_verdict as enum (
  'vegan',
  'probably_vegan',
  'vegetarian',
  'probably_vegetarian',
  'non_vegetarian',
  'unknown'
);

create table public.products (
  gtin text primary key check (gtin ~ '^[0-9]{8,14}$'),
  product_name text,
  brand text,
  current_revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_revisions (
  id uuid primary key default gen_random_uuid(),
  gtin text not null references public.products(gtin) on delete cascade,
  revision integer not null,
  verdict public.diet_verdict not null default 'unknown',
  assurance text not null,
  definitive boolean not null default false,
  reason text not null,
  classifier_version text not null,
  market text not null default 'ES',
  ingredients_text text,
  matched_ingredients text[] not null default '{}',
  traces text[] not null default '{}',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (gtin, revision)
);

-- ODbL-derived source data stays isolated from first-party review evidence.
create table public.open_food_facts_cache (
  gtin text primary key,
  payload jsonb not null,
  source_updated_at timestamptz,
  cached_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.product_evidence (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.product_revisions(id) on delete cascade,
  source_type text not null,
  source_name text not null,
  source_url text,
  source_license text,
  market text not null default 'ES',
  captured_at timestamptz not null,
  reviewer_id uuid references auth.users(id),
  storage_path text,
  content_hash text,
  created_at timestamptz not null default now()
);

create table public.menus (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id),
  edit_token_hash text not null,
  status text not null check (status in ('processing', 'ready', 'failed', 'published')),
  public_slug text unique,
  restaurant_name text not null default '',
  source_label text not null default 'Uploaded menu',
  source_captured_at timestamptz not null default now(),
  original_language text not null default 'unknown',
  service text,
  valid_on date,
  payload jsonb not null default '{"sections":[]}'::jsonb,
  original_delete_at timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  previous_value jsonb,
  next_value jsonb,
  created_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.product_revisions enable row level security;
alter table public.product_evidence enable row level security;
alter table public.open_food_facts_cache enable row level security;
alter table public.menus enable row level security;
alter table public.audit_events enable row level security;

create policy "published products are readable"
  on public.products for select using (true);
create policy "published revisions are readable"
  on public.product_revisions for select using (true);
create policy "evidence metadata is readable"
  on public.product_evidence for select using (true);
create policy "published menus are readable"
  on public.menus for select using (status = 'published' or owner_id = auth.uid());
create policy "owners update menus"
  on public.menus for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "authenticated users submit evidence"
  on public.product_evidence for insert to authenticated
  with check (reviewer_id = auth.uid());

-- The API service role owns writes and validates anonymous edit tokens by hash.
-- No client policy exposes OFF cache rows or the audit log.
