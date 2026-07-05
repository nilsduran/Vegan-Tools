create table public.restaurant_menu_cache (
  restaurant_key text primary key,
  restaurant jsonb not null,
  menu jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.restaurant_menu_cache enable row level security;

create policy "cached restaurant menus are readable"
  on public.restaurant_menu_cache for select using (true);

-- Writes go through the API service role. Cached menus contain extracted menu
-- data only; original uploaded images and private edit tokens are not stored.
