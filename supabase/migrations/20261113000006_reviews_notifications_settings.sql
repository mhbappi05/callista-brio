-- 6. Reviews, notifications, store settings

-- ------------------------------------------------------------------ reviews
create table public.reviews (
  id                    uuid primary key default gen_random_uuid(),
  product_id            uuid not null references public.products (id) on delete cascade,
  user_id               uuid not null references public.profiles (id) on delete cascade,
  order_item_id         uuid unique references public.order_items (id) on delete set null,
  rating                smallint not null check (rating between 1 and 5),
  title                 text check (title is null or length(title) <= 120),
  comment               text check (comment is null or length(comment) <= 2000),
  status                text not null default 'pending'
                        check (status in ('pending', 'approved', 'rejected')),
  is_verified_purchase  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index reviews_product_status_idx on public.reviews (product_id, status);
create index reviews_user_idx on public.reviews (user_id);

create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- Verified-purchase policy, enforced by the database rather than the client:
-- a review needs a DELIVERED order item belonging to the reviewer and the same
-- product. New and edited customer reviews always go back to moderation.
create or replace function public.reviews_enforce_policy()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if not exists (
      select 1
        from public.order_items oi
        join public.orders o on o.id = oi.order_id
       where oi.id = new.order_item_id
         and oi.product_id = new.product_id
         and o.user_id = new.user_id
         and o.order_status = 'delivered'
    ) then
      raise exception 'review_not_allowed' using errcode = '42501';
    end if;
    new.is_verified_purchase := true;
    new.status := 'pending';
  else
    if new.product_id is distinct from old.product_id
       or new.user_id is distinct from old.user_id
       or new.order_item_id is distinct from old.order_item_id then
      raise exception 'review_immutable_fields' using errcode = '42501';
    end if;
    if auth.uid() is not null and not public.has_role('owner', 'catalog_manager') then
      new.status := 'pending';
      new.is_verified_purchase := old.is_verified_purchase;
    end if;
  end if;
  return new;
end;
$$;

create trigger reviews_enforce_policy_trg
  before insert or update on public.reviews
  for each row execute function public.reviews_enforce_policy();

-- Public rating summary (approved reviews only; aggregate, so no personal data).
create view public.product_review_stats as
  select product_id,
         count(*)::int                    as review_count,
         round(avg(rating)::numeric, 2)   as average_rating
    from public.reviews
   where status = 'approved'
   group by product_id;

-- one row per in-app notification
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        text not null,
  title       text not null,
  body        text,
  data        jsonb not null default '{}'::jsonb,
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ----------------------------------------------------------- store settings
create table public.store_settings (
  key         text primary key check (key ~ '^[a-z0-9_]+$'),
  value       jsonb not null,
  is_public   boolean not null default false,
  updated_at  timestamptz not null default now()
);

create trigger store_settings_set_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();
create trigger store_settings_audit
  after insert or update or delete on public.store_settings
  for each row execute function public.audit_row_change();

-- Safe defaults. Every payment method starts DISABLED: the owner must confirm
-- COD conditions and provider details before enabling anything (doc section 18).
-- Never store payment secrets here; this table is readable when is_public.
insert into public.store_settings (key, value, is_public) values
  ('announcement',     '{"enabled": false, "text": ""}'::jsonb, true),
  ('payment_methods',  '{"cod": false, "bkash_manual": false, "nagad_manual": false, "gateway": false}'::jsonb, true),
  ('store_contact',    '{"email": null, "phone": null, "whatsapp": null}'::jsonb, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------- RLS
alter table public.reviews         enable row level security;
alter table public.notifications   enable row level security;
alter table public.store_settings  enable row level security;

create policy "reviews: public read approved"
  on public.reviews for select using (status = 'approved');
create policy "reviews: read own"
  on public.reviews for select using (user_id = auth.uid());
create policy "reviews: customer insert own"
  on public.reviews for insert with check (user_id = auth.uid());
create policy "reviews: customer update own"
  on public.reviews for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews: customer delete own"
  on public.reviews for delete using (user_id = auth.uid());
create policy "reviews: staff moderate"
  on public.reviews for all
  using (public.has_role('owner', 'catalog_manager'))
  with check (public.has_role('owner', 'catalog_manager'));

create policy "notifications: read own"
  on public.notifications for select using (user_id = auth.uid());
create policy "notifications: mark own read"
  on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "store_settings: public read"
  on public.store_settings for select using (is_public);
create policy "store_settings: owner manage"
  on public.store_settings for all
  using (public.has_role('owner')) with check (public.has_role('owner'));
