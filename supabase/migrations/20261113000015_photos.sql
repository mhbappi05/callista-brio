-- 15. Photos
-- * product photos: atomic reorder (first = main photo) and a 10-photo limit
-- * review photos: table, 3-photo limit, moderation reset, storage bucket and policies

-- ============================================================ product photos
-- Reorder atomically. The first id becomes the main photo.
create or replace function public.admin_reorder_product_images(p_product_id uuid, p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if not public.has_role('owner', 'catalog_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select count(*) into v_count from public.product_images where product_id = p_product_id;

  -- The list must contain exactly this product's photos, each once.
  if v_count <> coalesce(array_length(p_ids, 1), 0)
     or (select count(distinct x) from unnest(p_ids) x) <> v_count
     or exists (
       select 1 from unnest(p_ids) x
        where not exists (select 1 from public.product_images i where i.id = x and i.product_id = p_product_id)
     ) then
    raise exception 'invalid_image_list' using errcode = 'P0001';
  end if;

  -- Two steps, because only one photo per product may be primary at a time.
  update public.product_images set is_primary = false where product_id = p_product_id;
  update public.product_images i
     set display_order = o.ord - 1,
         is_primary = (o.ord = 1)
    from unnest(p_ids) with ordinality as o(id, ord)
   where i.id = o.id;
end;
$$;

revoke all on function public.admin_reorder_product_images(uuid, uuid[]) from public, anon;
grant execute on function public.admin_reorder_product_images(uuid, uuid[]) to authenticated;

-- At most 10 photos per product.
create or replace function public.product_images_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.product_images where product_id = new.product_id) >= 10 then
    raise exception 'too_many_images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger product_images_limit_trg
  before insert on public.product_images
  for each row execute function public.product_images_limit();

-- ============================================================= review photos
create table public.review_images (
  id            uuid primary key default gen_random_uuid(),
  review_id     uuid not null references public.reviews (id) on delete cascade,
  storage_path  text not null unique
                check (storage_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  created_at    timestamptz not null default now()
);
create index review_images_review_idx on public.review_images (review_id);

-- At most 3 photos per review.
create or replace function public.review_images_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.review_images where review_id = new.review_id) >= 3 then
    raise exception 'too_many_review_images' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger review_images_limit_trg
  before insert on public.review_images
  for each row execute function public.review_images_limit();

-- A customer adding or removing a photo sends the review back to moderation.
create or replace function public.review_images_reset_moderation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_review uuid;
begin
  if tg_op = 'DELETE' then
    v_review := old.review_id;
  else
    v_review := new.review_id;
  end if;

  if auth.uid() is not null and not public.has_role('owner', 'catalog_manager') then
    update public.reviews set status = 'pending' where id = v_review and status <> 'pending';
  end if;
  return null;
end;
$$;

create trigger review_images_reset_trg
  after insert or delete on public.review_images
  for each row execute function public.review_images_reset_moderation();

alter table public.review_images enable row level security;

-- Visitors see photos only once the review is approved.
create policy "review_images: read visible"
  on public.review_images for select
  using (exists (
    select 1 from public.reviews r
     where r.id = review_id
       and (r.status = 'approved' or r.user_id = auth.uid() or public.has_role('owner', 'catalog_manager'))
  ));

create policy "review_images: owner insert"
  on public.review_images for insert
  with check (
    storage_path like (auth.uid()::text || '/%')
    and exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid())
  );

create policy "review_images: owner delete"
  on public.review_images for delete
  using (exists (select 1 from public.reviews r where r.id = review_id and r.user_id = auth.uid()));

create policy "review_images: staff manage"
  on public.review_images for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));

-- New tables get broad default privileges in Supabase; strip them, then grant only what is needed.
revoke all on public.review_images from anon, authenticated;
grant select on public.review_images to anon, authenticated;
grant insert, delete on public.review_images to authenticated;

-- ------------------------------------------------------------------- storage
-- Public bucket with unguessable file names. Files are only linked from the
-- site (via review_images) once the review is approved.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-images', 'review-images', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A customer can read their own folder (also lets the upload cap below count it).
create policy "storage: customers read own review images"
  on storage.objects for select to authenticated
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

-- Uploads: own folder only, fixed file-name shape, only customers who have a
-- delivered order, and at most 30 files in total.
create policy "storage: customers upload review images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'review-images'
    and (storage.foldername(name))[1] = auth.uid()::text
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$'
    and exists (select 1 from public.orders o where o.user_id = auth.uid() and o.order_status = 'delivered')
    and (select count(*) from storage.objects x
          where x.bucket_id = 'review-images'
            and (storage.foldername(x.name))[1] = auth.uid()::text) < 30
  );

create policy "storage: customers delete own review images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'review-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "storage: staff delete review images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'review-images' and public.has_role('owner', 'catalog_manager'));
