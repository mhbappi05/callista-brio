-- 13. Home page banners (offers and news) and their storage bucket

create table public.home_banners (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null default 'offer' check (kind in ('offer', 'news')),
  title          text not null check (length(btrim(title)) between 1 and 80),
  subtitle       text check (subtitle is null or length(subtitle) <= 160),
  cta_label      text check (cta_label is null or length(btrim(cta_label)) between 1 and 30),
  -- an internal path such as /shop, or a full http(s) link; never //host
  cta_url        text check (cta_url is null or cta_url ~ '^(/($|[^/])|https?://)'),
  image_path     text,
  starts_at      timestamptz,
  ends_at        timestamptz,
  display_order  integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint home_banners_window check (starts_at is null or ends_at is null or starts_at < ends_at),
  constraint home_banners_cta_pair check ((cta_label is null) = (cta_url is null))
);
create index home_banners_order_idx on public.home_banners (display_order, created_at desc);

create trigger home_banners_set_updated_at before update on public.home_banners
  for each row execute function public.set_updated_at();
create trigger home_banners_audit
  after insert or update or delete on public.home_banners
  for each row execute function public.audit_row_change();

alter table public.home_banners enable row level security;

create policy "home_banners: public read live"
  on public.home_banners for select
  using (is_active
         and (starts_at is null or starts_at <= now())
         and (ends_at is null or ends_at > now()));

create policy "home_banners: catalog staff manage"
  on public.home_banners for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));

-- New tables get broad default privileges in Supabase; strip them, then grant only what is needed.
revoke all on public.home_banners from anon, authenticated;
grant select on public.home_banners to anon, authenticated;
grant insert, update, delete on public.home_banners to authenticated;

-- ------------------------------------------------------------------- storage
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('home-banners', 'home-banners', true, 8388608,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "storage: public read home banners"
  on storage.objects for select
  using (bucket_id = 'home-banners');

create policy "storage: staff insert home banners"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'home-banners'
    and public.has_role('owner', 'catalog_manager')
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]+\.(jpe?g|png|webp|avif)$'
  );

create policy "storage: staff update home banners"
  on storage.objects for update to authenticated
  using (bucket_id = 'home-banners' and public.has_role('owner', 'catalog_manager'))
  with check (bucket_id = 'home-banners' and public.has_role('owner', 'catalog_manager'));

create policy "storage: staff delete home banners"
  on storage.objects for delete to authenticated
  using (bucket_id = 'home-banners' and public.has_role('owner', 'catalog_manager'));
