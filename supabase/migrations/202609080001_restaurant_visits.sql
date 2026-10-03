-- User personal restaurant visit diary logs
create table if not exists public.restaurant_visits (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  restaurant_id text not null,
  restaurant_name text not null,
  restaurant_address text,
  restaurant_image text,
  cuisine text,
  visit_date date,
  rating numeric(2, 1) not null check (rating >= 0.5 and rating <= 5.0),
  notes text default '',
  dishes_tried text[] default '{}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for speedy queries by user and restaurant
create index if not exists idx_restaurant_visits_user_id on public.restaurant_visits(user_id);
create index if not exists idx_restaurant_visits_restaurant on public.restaurant_visits(restaurant_id);

-- Enforce maximum 1 log per restaurant per day when visit_date is provided
create unique index if not exists idx_restaurant_visits_user_rest_date
  on public.restaurant_visits(user_id, restaurant_id, visit_date)
  where visit_date is not null;

-- Enable Row Level Security (RLS)
alter table public.restaurant_visits enable row level security;

-- Users can read, insert, update and delete their own visits
create policy "users can read their own visits"
  on public.restaurant_visits for select
  using (auth.uid()::text = user_id or auth.role() = 'service_role');

create policy "users can insert their own visits"
  on public.restaurant_visits for insert
  with check (auth.uid()::text = user_id or auth.role() = 'service_role');

create policy "users can update their own visits"
  on public.restaurant_visits for update
  using (auth.uid()::text = user_id or auth.role() = 'service_role');

create policy "users can delete their own visits"
  on public.restaurant_visits for delete
  using (auth.uid()::text = user_id or auth.role() = 'service_role');

-- Top 4 Favorite Restaurants pinned showcase
create table if not exists public.user_top4 (
  user_id text primary key,
  restaurants jsonb not null default '[]'::jsonb,
  updated_at timestamp with time zone default now()
);

alter table public.user_top4 enable row level security;

-- Top 4 is publicly readable for user profile showcase
create policy "user top4 is publicly readable"
  on public.user_top4 for select
  using (true);

create policy "users can update their own top4"
  on public.user_top4 for all
  using (auth.uid()::text = user_id or auth.role() = 'service_role')
  with check (auth.uid()::text = user_id or auth.role() = 'service_role');
