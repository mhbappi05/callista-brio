-- 7. Storage buckets and policies
--
-- Object paths are predictable and validated: <uuid>/<safe-file-name>.<ext>
-- (the uuid is the product id or collection id). Arbitrary paths are rejected.
-- Check current Supabase plan storage/bandwidth limits before launch.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images',     'product-images',     true,  5242880,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('collection-banners', 'collection-banners', true,  8388608,
     array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('private-documents',  'private-documents',  false, 10485760,
     array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read for the two public image buckets.
create policy "storage: public read product images"
  on storage.objects for select
  using (bucket_id in ('product-images', 'collection-banners'));

-- Catalog staff upload/modify images, only at validated paths.
create policy "storage: catalog staff insert images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id in ('product-images', 'collection-banners')
    and public.has_role('owner', 'catalog_manager')
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif)$'
  );

create policy "storage: catalog staff update images"
  on storage.objects for update to authenticated
  using (
    bucket_id in ('product-images', 'collection-banners')
    and public.has_role('owner', 'catalog_manager')
  )
  with check (
    bucket_id in ('product-images', 'collection-banners')
    and public.has_role('owner', 'catalog_manager')
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif)$'
  );

create policy "storage: catalog staff delete images"
  on storage.objects for delete to authenticated
  using (
    bucket_id in ('product-images', 'collection-banners')
    and public.has_role('owner', 'catalog_manager')
  );

-- Private bucket: owner only (unused until a private-file need exists).
create policy "storage: owner manage private documents"
  on storage.objects for all to authenticated
  using (bucket_id = 'private-documents' and public.has_role('owner'))
  with check (bucket_id = 'private-documents' and public.has_role('owner'));
