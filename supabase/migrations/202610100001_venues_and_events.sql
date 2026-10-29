-- Migration: 202610100001_venues_and_events.sql
-- Description: System of Record for restaurants, event-driven lifecycle log, and PostGIS spatial indexing (DDIA principles).

create extension if not exists postgis;
create extension if not exists btree_gist;

-- Enum types for venue lifecycle and diet classification
do $$ begin
  create type public.venue_lifecycle_status as enum (
    'proposed',
    'verified_active',
    'under_review',
    'temporarily_closed',
    'permanently_closed'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.vegan_classification as enum (
    '100_percent_vegan',
    'vegetarian',
    'veg_friendly'
  );
exception
  when duplicate_object then null;
end $$;

-- 1. Main System of Record table
create table if not exists public.venues (
  id text primary key,
  osm_id text unique,
  name text not null,
  address text not null,
  city_hub text not null,
  
  -- Spatial location in WGS 84 (SRID 4326)
  location geography(Point, 4326) not null,
  latitude double precision not null,
  longitude double precision not null,
  
  classification public.vegan_classification not null default '100_percent_vegan',
  is_featured boolean not null default false,
  status public.venue_lifecycle_status not null default 'verified_active',
  
  cuisine_type text not null default 'mediterranean',
  tags text[] not null default '{}',
  website_url text,
  opening_hours text,
  rating numeric(3, 2) check (rating >= 1.0 and rating <= 5.0),
  image_url text,
  
  closed_at timestamptz,
  closure_reason text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indices for spatial and lifecycle performance
create index if not exists idx_venues_location on public.venues using gist (location);
create index if not exists idx_venues_hub_status on public.venues (city_hub, status, is_featured);

-- 2. Immutable Event Sourcing Log
create table if not exists public.venue_events (
  id bigint generated always as identity primary key,
  venue_id text not null references public.venues(id) on delete cascade,
  event_type text not null,
  actor_id text not null,
  payload jsonb not null default '{}'::jsonb,
  source_evidence text,
  created_at timestamptz not null default now()
);

create index if not exists idx_venue_events_venue on public.venue_events (venue_id, created_at desc);

-- 3. External Mapping Registry (Reconciliation & Tombstone Guard)
create table if not exists public.venue_external_mappings (
  provider text not null,
  external_id text not null,
  venue_id text not null references public.venues(id) on delete cascade,
  is_blacklisted boolean not null default false,
  synced_at timestamptz not null default now(),
  primary key (provider, external_id)
);

create index if not exists idx_venue_external_mappings_venue on public.venue_external_mappings (venue_id);

-- Row Level Security
alter table public.venues enable row level security;
alter table public.venue_events enable row level security;
alter table public.venue_external_mappings enable row level security;

-- Public read access: Only active verified venues are publicly queryable by default
create policy "active venues are publicly readable"
  on public.venues for select
  using (status in ('verified_active', 'temporarily_closed'));

create policy "venue events are readable by authenticated users"
  on public.venue_events for select
  using (auth.role() = 'authenticated');
