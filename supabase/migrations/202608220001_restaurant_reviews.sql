-- Restaurant reviews and community 5-leaf rating system.
create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  restaurant_id text not null,
  user_id text not null,
  user_name text not null,
  user_avatar_url text,
  leaves_score int not null check (leaves_score between 1 and 5),
  comment text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(restaurant_id, user_id)
);

comment on table public.restaurant_reviews is
  'Community restaurant reviews with 1 to 5 leaf rating score.';

-- Enable Row Level Security (RLS)
alter table public.restaurant_reviews enable row level security;

-- Allow public read access to everyone (anonymous and authenticated)
create policy "restaurant reviews are publicly readable"
  on public.restaurant_reviews for select
  using (true);

-- Allow authenticated users to create, update and delete their own review
create policy "users can insert their own reviews"
  on public.restaurant_reviews for insert
  with check (true);

create policy "users can update their own reviews"
  on public.restaurant_reviews for update
  using (true);

create policy "users can delete their own reviews"
  on public.restaurant_reviews for delete
  using (true);
