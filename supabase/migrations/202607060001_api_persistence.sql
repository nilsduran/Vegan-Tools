-- Keep the complete normalized API result alongside the relational product
-- metadata. Open Food Facts-derived values remain isolated from first-party
-- evidence in the existing cache/evidence tables.
alter table public.products
  add column if not exists payload jsonb;

comment on column public.products.payload is
  'Latest complete ProductResult returned by the Vegan Tools API.';

-- Originals stay private. The API accesses them with its server-side secret
-- key and streams them through /v1/menu-sources after validating the path.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'menu-sources',
  'menu-sources',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/plain'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
