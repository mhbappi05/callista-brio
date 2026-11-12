-- 4. Carts and wishlists
--
-- Authenticated carts are protected by RLS (user_id = auth.uid()).
-- GUEST carts are deliberately NOT reachable through the public API: a guest
-- cart is identified by a random token whose SHA-256 hash is stored here, and
-- all guest cart reads/writes go through an Edge Function using the service
-- role. A token is a temporary bearer secret for that one cart, nothing more.
-- A cart does not reserve stock.

create table public.carts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid unique references public.profiles (id) on delete cascade,
  guest_token_hash  text unique,
  expires_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint carts_owner_present check (user_id is not null or guest_token_hash is not null)
);
create index carts_expires_idx on public.carts (expires_at) where user_id is null;

create table public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  variant_id  uuid references public.product_variants (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 20),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index cart_items_cart_idx on public.cart_items (cart_id);
create unique index cart_items_unique_line
  on public.cart_items (cart_id, product_id,
                        coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.wishlists (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, product_id)
);

create trigger carts_set_updated_at before update on public.carts
  for each row execute function public.set_updated_at();
create trigger cart_items_set_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

alter table public.carts       enable row level security;
alter table public.cart_items  enable row level security;
alter table public.wishlists   enable row level security;

create policy "carts: manage own"
  on public.carts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "cart_items: manage own"
  on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

create policy "wishlists: manage own"
  on public.wishlists for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
