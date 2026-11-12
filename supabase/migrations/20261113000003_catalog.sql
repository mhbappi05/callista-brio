-- 3. Catalog: categories, collections, products, images, variants

create table public.categories (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) between 1 and 80),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text,
  image_path     text,
  display_order  integer not null default 0,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.collections (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) between 1 and 80),
  slug           text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description    text,
  banner_path    text,
  display_order  integer not null default 0,
  is_featured    boolean not null default false,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  collection_id       uuid references public.collections (id) on delete set null,
  category_id         uuid references public.categories (id) on delete set null,
  name                text not null check (length(btrim(name)) between 1 and 160),
  slug                text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description         text,
  story               text,
  material            text,
  color               text,
  dimensions          text,
  weight_grams        numeric(8,2) check (weight_grams is null or weight_grams >= 0),
  care_instructions   text,
  sku                 text unique,
  price               numeric(10,2) not null check (price >= 0),
  discount_price      numeric(10,2),
  -- When true, variant rows are authoritative for stock and SKU and the
  -- product-level stock_quantity is ignored (never count both).
  has_variants        boolean not null default false,
  stock_quantity      integer not null default 0 check (stock_quantity >= 0),
  low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0),
  is_featured         boolean not null default false,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint products_discount_valid
    check (discount_price is null or (discount_price >= 0 and discount_price < price)),
  search_vector tsvector generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(description, '') || ' ' ||
      coalesce(material, '') || ' ' || coalesce(color, ''))
  ) stored
);
create index products_category_idx   on public.products (category_id);
create index products_collection_idx on public.products (collection_id);
create index products_active_featured_idx on public.products (is_active, is_featured);
create index products_active_created_idx on public.products (created_at desc) where is_active;
create index products_search_idx on public.products using gin (search_vector);

create table public.product_images (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products (id) on delete cascade,
  storage_path   text not null,
  alt_text       text not null default '',
  display_order  integer not null default 0,
  is_primary     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, display_order);
create unique index product_images_one_primary
  on public.product_images (product_id) where is_primary;

create table public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  name            text not null check (length(btrim(name)) between 1 and 120),
  sku             text unique,
  price           numeric(10,2) check (price is null or price >= 0),  -- optional override
  stock_quantity  integer not null default 0 check (stock_quantity >= 0),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);

-- updated_at triggers
create trigger categories_set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();
create trigger collections_set_updated_at before update on public.collections
  for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- Audit price/visibility changes (stock changes are covered by inventory_logs).
create trigger products_audit
  after insert or delete or update of price, discount_price, is_active on public.products
  for each row execute function public.audit_row_change();

-- ---------------------------------------------------------------------- RLS
alter table public.categories        enable row level security;
alter table public.collections       enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;

-- Public visitors: active/published rows only.
create policy "categories: public read active"
  on public.categories for select using (is_active);
create policy "collections: public read active"
  on public.collections for select using (is_active);
create policy "products: public read active"
  on public.products for select using (is_active);
create policy "product_images: public read for active products"
  on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id and p.is_active));
create policy "product_variants: public read active"
  on public.product_variants for select
  using (is_active and exists (select 1 from public.products p where p.id = product_id and p.is_active));

-- Catalog staff: full control (also lets them read inactive rows).
create policy "categories: catalog staff manage"
  on public.categories for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));
create policy "collections: catalog staff manage"
  on public.collections for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));
create policy "products: catalog staff manage"
  on public.products for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));
create policy "product_images: catalog staff manage"
  on public.product_images for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));
create policy "product_variants: catalog staff manage"
  on public.product_variants for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));
