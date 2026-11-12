-- 5. Delivery zones, coupons, orders, payments, refunds, returns, inventory
--
-- Clients can READ their own order data but can never write to these tables.
-- All writes happen in SECURITY DEFINER functions / service-role Edge Functions
-- (see the functions migration).

-- ---------------------------------------------------------- order numbers
create sequence public.order_number_seq start 1;

create or replace function public.generate_order_number()
returns text
language sql
volatile
as $$
  select 'CB-'
      || to_char(now() at time zone 'Asia/Dhaka', 'YYMMDD')
      || '-'
      || lpad(nextval('public.order_number_seq')::text, 5, '0');
$$;

-- ----------------------------------------------------------- delivery zones
-- Fees and coverage are configured by the owner. Nothing is hard-coded:
-- the rows must be created before checkout can work.
create table public.delivery_zones (
  id                       uuid primary key default gen_random_uuid(),
  code                     text not null unique check (code ~ '^[a-z0-9_]+$'),
  name                     text not null,
  fee                      numeric(10,2) not null check (fee >= 0),
  free_delivery_threshold  numeric(10,2) check (free_delivery_threshold is null or free_delivery_threshold > 0),
  -- Districts matched case-insensitively. The fallback zone serves any
  -- district not listed in another active zone.
  districts                text[] not null default '{}',
  is_fallback              boolean not null default false,
  is_active                boolean not null default true,
  display_order            integer not null default 0,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create unique index delivery_zones_single_fallback
  on public.delivery_zones (is_fallback) where is_fallback;

create trigger delivery_zones_set_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();
create trigger delivery_zones_audit
  after insert or update or delete on public.delivery_zones
  for each row execute function public.audit_row_change();

-- ------------------------------------------------------------------ coupons
create table public.coupons (
  id                   uuid primary key default gen_random_uuid(),
  code                 text not null check (code = upper(code) and length(code) between 3 and 32),
  description          text,
  discount_type        text not null check (discount_type in ('percentage', 'fixed')),
  discount_value       numeric(10,2) not null check (discount_value > 0),
  min_order_amount     numeric(10,2) not null default 0 check (min_order_amount >= 0),
  max_discount_amount  numeric(10,2) check (max_discount_amount is null or max_discount_amount > 0),
  usage_limit          integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit   integer not null default 1 check (per_customer_limit > 0),
  used_count           integer not null default 0 check (used_count >= 0),
  starts_at            timestamptz,
  expires_at           timestamptz,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint coupons_percentage_range
    check (discount_type <> 'percentage' or discount_value <= 100),
  constraint coupons_window_valid
    check (starts_at is null or expires_at is null or starts_at < expires_at)
);
create unique index coupons_code_key on public.coupons (code);

create trigger coupons_set_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();
create trigger coupons_audit
  after insert or update or delete on public.coupons
  for each row execute function public.audit_row_change();

-- ------------------------------------------------------------------- orders
create table public.orders (
  id                   uuid primary key default gen_random_uuid(),
  order_number         text not null unique default public.generate_order_number(),
  user_id              uuid references public.profiles (id) on delete set null,
  idempotency_key      text unique,

  customer_name        text not null check (length(btrim(customer_name)) between 1 and 120),
  customer_phone       text not null check (customer_phone ~ '^\+8801[3-9][0-9]{8}$'),
  customer_email       text check (customer_email is null or customer_email ~ '^[^@\s]+@[^@\s]+$'),
  customer_note        text check (customer_note is null or length(customer_note) <= 500),

  shipping_address     jsonb not null,           -- snapshot, never edited
  delivery_zone_code   text not null,            -- snapshot
  delivery_zone_name   text not null,            -- snapshot
  delivery_fee         numeric(10,2) not null check (delivery_fee >= 0),

  subtotal             numeric(10,2) not null check (subtotal >= 0),
  discount_total       numeric(10,2) not null default 0 check (discount_total >= 0),
  total_amount         numeric(10,2) not null check (total_amount >= 0),
  coupon_id            uuid references public.coupons (id) on delete set null,
  coupon_code          text,                     -- snapshot

  -- Order status and payment status are independent.
  order_status         text not null default 'pending'
                       check (order_status in ('pending', 'confirmed', 'processing', 'packed',
                                               'shipped', 'delivered', 'cancelled')),
  payment_method       text not null
                       check (payment_method in ('cod', 'bkash_manual', 'nagad_manual', 'gateway')),
  -- Summary of the latest payment attempt; kept in sync by a trigger.
  payment_status       text not null default 'unpaid'
                       check (payment_status in ('unpaid', 'pending', 'paid', 'failed',
                                                 'partially_refunded', 'refunded', 'requires_review')),

  courier_name         text,
  tracking_number      text,
  tracking_url         text,
  placed_at            timestamptz not null default now(),
  shipped_at           timestamptz,
  delivered_at         timestamptz,
  cancelled_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),

  constraint orders_total_consistent
    check (total_amount = subtotal - discount_total + delivery_fee),
  constraint orders_discount_le_subtotal check (discount_total <= subtotal)
);
create index orders_user_placed_idx   on public.orders (user_id, placed_at desc);
create index orders_status_placed_idx on public.orders (order_status, placed_at desc);
create index orders_phone_idx         on public.orders (customer_phone);

create table public.order_items (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  product_id           uuid references public.products (id) on delete set null,
  variant_id           uuid references public.product_variants (id) on delete set null,
  product_name         text not null,
  sku                  text,
  variant_description  text,
  product_image        text,
  quantity             integer not null check (quantity > 0),
  unit_price           numeric(10,2) not null check (unit_price >= 0),
  line_total           numeric(10,2) not null check (line_total >= 0),
  created_at           timestamptz not null default now(),
  constraint order_items_line_total_consistent check (line_total = unit_price * quantity)
);
create index order_items_order_idx   on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  from_status  text,
  to_status    text not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

create table public.payments (
  id                     uuid primary key default gen_random_uuid(),
  order_id               uuid not null references public.orders (id) on delete cascade,
  method                 text not null
                         check (method in ('cod', 'bkash_manual', 'nagad_manual', 'gateway')),
  provider               text,                    -- e.g. gateway name
  amount                 numeric(10,2) not null check (amount >= 0),
  currency               text not null default 'BDT' check (currency = 'BDT'),
  status                 text not null default 'unpaid'
                         check (status in ('unpaid', 'pending', 'paid', 'failed',
                                           'partially_refunded', 'refunded', 'requires_review')),
  provider_reference     text,                    -- gateway session/transaction id
  manual_transaction_id  text,                    -- bKash/Nagad TrxID entered by customer
  manual_sender_phone    text,
  verification_metadata  jsonb not null default '{}'::jsonb,
  verified_by            uuid references public.profiles (id) on delete set null,
  verified_at            timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);
-- Idempotent webhook handling: a gateway reference can exist only once.
create unique index payments_provider_ref_key
  on public.payments (provider, provider_reference) where provider_reference is not null;
-- A manual transaction id can only be claimed by one payment.
create unique index payments_manual_txn_key
  on public.payments (method, manual_transaction_id) where manual_transaction_id is not null;

create table public.refunds (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments (id) on delete restrict,
  order_id      uuid not null references public.orders (id) on delete cascade,
  amount        numeric(10,2) not null check (amount > 0),
  reason        text,
  status        text not null default 'requested'
                check (status in ('requested', 'approved', 'processed', 'rejected')),
  processed_by  uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);

-- Return/exchange requests (the original order is never rewritten).
create table public.return_requests (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  user_id     uuid references public.profiles (id) on delete set null,
  reason      text not null check (length(btrim(reason)) between 1 and 1000),
  status      text not null default 'requested'
              check (status in ('requested', 'approved', 'rejected', 'received', 'completed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index return_requests_order_idx on public.return_requests (order_id);

create table public.coupon_usages (
  id               uuid primary key default gen_random_uuid(),
  coupon_id        uuid not null references public.coupons (id) on delete restrict,
  order_id         uuid not null unique references public.orders (id) on delete cascade,
  user_id          uuid references public.profiles (id) on delete set null,
  customer_phone   text not null,
  discount_amount  numeric(10,2) not null check (discount_amount >= 0),
  created_at       timestamptz not null default now()
);
create index coupon_usages_coupon_idx on public.coupon_usages (coupon_id);

create table public.inventory_logs (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid references public.products (id) on delete set null,
  variant_id       uuid references public.product_variants (id) on delete set null,
  quantity_change  integer not null check (quantity_change <> 0),
  reason           text not null
                   check (reason in ('initial_stock', 'order_placed', 'order_cancelled',
                                     'return_restock', 'manual_adjustment', 'correction')),
  order_id         uuid references public.orders (id) on delete set null,
  actor_id         uuid references public.profiles (id) on delete set null,
  note             text,
  created_at       timestamptz not null default now()
);
create index inventory_logs_product_idx on public.inventory_logs (product_id, created_at desc);
create index inventory_logs_order_idx   on public.inventory_logs (order_id);

-- --------------------------------------------------------------- triggers
create trigger orders_set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();
create trigger refunds_set_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();
create trigger return_requests_set_updated_at before update on public.return_requests
  for each row execute function public.set_updated_at();

-- Restores stock for an order's items (used on cancellation, and by return flow).
create or replace function public.restore_order_stock(p_order_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  for r in
    select product_id, variant_id, quantity, variant_description
      from public.order_items
     where order_id = p_order_id
       and product_id is not null
  loop
    if r.variant_id is not null then
      update public.product_variants
         set stock_quantity = stock_quantity + r.quantity
       where id = r.variant_id;
    elsif r.variant_description is null then
      update public.products
         set stock_quantity = stock_quantity + r.quantity
       where id = r.product_id;
    else
      -- The variant was deleted after purchase; there is nothing to restore into.
      continue;
    end if;

    insert into public.inventory_logs (product_id, variant_id, quantity_change, reason, order_id, actor_id)
    values (r.product_id, r.variant_id, r.quantity, p_reason, p_order_id, auth.uid());
  end loop;
end;
$$;

-- Enforces allowed status transitions and protects order snapshots.
create or replace function public.orders_guard_update()
returns trigger
language plpgsql
as $$
begin
  if new.order_number   is distinct from old.order_number
     or new.subtotal       is distinct from old.subtotal
     or new.discount_total is distinct from old.discount_total
     or new.delivery_fee   is distinct from old.delivery_fee
     or new.total_amount   is distinct from old.total_amount
     or new.shipping_address is distinct from old.shipping_address then
    raise exception 'order_snapshot_immutable' using errcode = 'P0001';
  end if;

  if new.order_status is distinct from old.order_status then
    if not (
         (old.order_status = 'pending'    and new.order_status in ('confirmed', 'cancelled'))
      or (old.order_status = 'confirmed'  and new.order_status in ('processing', 'cancelled'))
      or (old.order_status = 'processing' and new.order_status in ('packed', 'cancelled'))
      or (old.order_status = 'packed'     and new.order_status in ('shipped', 'cancelled'))
      or (old.order_status = 'shipped'    and new.order_status = 'delivered')
    ) then
      raise exception 'invalid_status_transition' using
        errcode = 'P0001',
        detail  = old.order_status || ' -> ' || new.order_status;
    end if;

    if new.order_status = 'shipped'   then new.shipped_at   := coalesce(new.shipped_at, now());   end if;
    if new.order_status = 'delivered' then new.delivered_at := coalesce(new.delivered_at, now()); end if;
    if new.order_status = 'cancelled' then new.cancelled_at := coalesce(new.cancelled_at, now()); end if;
  end if;
  return new;
end;
$$;

create trigger orders_guard_update_trg
  before update on public.orders
  for each row execute function public.orders_guard_update();

-- Status history, stock restore on cancellation, customer notification.
create or replace function public.orders_after_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by)
    values (new.id, null, new.order_status, auth.uid());
    return null;
  end if;

  if new.order_status is distinct from old.order_status then
    insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
    values (new.id, old.order_status, new.order_status, auth.uid(),
            nullif(current_setting('app.status_note', true), ''));

    if new.order_status = 'cancelled' then
      perform public.restore_order_stock(new.id, 'order_cancelled');
    end if;

    if new.user_id is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (new.user_id, 'order_status',
              'Order ' || new.order_number || ' is now ' || replace(new.order_status, '_', ' '),
              null,
              jsonb_build_object('order_id', new.id, 'order_number', new.order_number,
                                 'status', new.order_status));
    end if;
  end if;
  return null;
end;
$$;

create trigger orders_after_status_trg
  after insert or update of order_status on public.orders
  for each row execute function public.orders_after_status();

-- Order items are immutable snapshots.
create or replace function public.order_items_block_update()
returns trigger
language plpgsql
as $$
begin
  raise exception 'order_items_immutable' using errcode = 'P0001';
end;
$$;

create trigger order_items_immutable_trg
  before update on public.order_items
  for each row execute function public.order_items_block_update();

-- Keep the order's payment_status summary in sync with its payment rows.
create or replace function public.payments_sync_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
     set payment_status = new.status
   where id = new.order_id
     and payment_status is distinct from new.status;
  return null;
end;
$$;

create trigger payments_sync_order_trg
  after insert or update of status on public.payments
  for each row execute function public.payments_sync_order();

-- ---------------------------------------------------------------------- RLS
alter table public.delivery_zones        enable row level security;
alter table public.coupons               enable row level security;
alter table public.orders                enable row level security;
alter table public.order_items           enable row level security;
alter table public.order_status_history  enable row level security;
alter table public.payments              enable row level security;
alter table public.refunds               enable row level security;
alter table public.return_requests       enable row level security;
alter table public.coupon_usages         enable row level security;
alter table public.inventory_logs        enable row level security;

-- Delivery zones: fees are public so checkout can show them; owner edits.
create policy "delivery_zones: public read active"
  on public.delivery_zones for select using (is_active);
create policy "delivery_zones: owner manage"
  on public.delivery_zones for all
  using (public.has_role('owner')) with check (public.has_role('owner'));

-- Coupons: never readable by customers (they go through apply-coupon).
create policy "coupons: owner manage"
  on public.coupons for all
  using (public.has_role('owner')) with check (public.has_role('owner'));

-- Orders and children: customers read their own; order staff read all.
-- There are intentionally NO insert/update/delete policies.
create policy "orders: read own"
  on public.orders for select using (user_id = auth.uid());
create policy "orders: staff read"
  on public.orders for select using (public.has_role('owner', 'order_manager'));

create policy "order_items: read own"
  on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_items: staff read"
  on public.order_items for select using (public.has_role('owner', 'order_manager'));

create policy "order_status_history: read own"
  on public.order_status_history for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "order_status_history: staff read"
  on public.order_status_history for select using (public.has_role('owner', 'order_manager'));

-- Payments: staff only. Customers use the my_payments view (safe columns).
create policy "payments: staff read"
  on public.payments for select using (public.has_role('owner', 'order_manager'));

create policy "refunds: read own"
  on public.refunds for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
create policy "refunds: staff read"
  on public.refunds for select using (public.has_role('owner', 'order_manager'));

create policy "return_requests: read own"
  on public.return_requests for select using (user_id = auth.uid());
create policy "return_requests: staff read"
  on public.return_requests for select using (public.has_role('owner', 'order_manager'));

create policy "coupon_usages: staff read"
  on public.coupon_usages for select using (public.has_role('owner'));

create policy "inventory_logs: catalog staff read"
  on public.inventory_logs for select using (public.has_role('owner', 'catalog_manager'));

-- Customer-safe payment summary. Intentionally runs with the view owner's
-- rights (so it can read payments) and filters to the caller's own orders.
-- It exposes no transaction ids, provider references or verification notes.
create view public.my_payments as
  select p.id, p.order_id, p.method, p.amount, p.currency, p.status, p.created_at
    from public.payments p
    join public.orders o on o.id = p.order_id
   where o.user_id = auth.uid();
