-- 2. Profiles, role helpers, addresses, admin audit log

-- ---------------------------------------------------------------- profiles
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text check (full_name is null or length(full_name) <= 120),
  email       text,
  phone       text,
  role        text not null default 'customer'
              check (role in ('customer', 'owner', 'order_manager', 'catalog_manager')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_phone_format
    check (phone is null or phone ~ '^\+8801[3-9][0-9]{8}$')
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------ role helpers
-- SECURITY DEFINER so policies can read the caller's role without exposing
-- the profiles table. search_path is pinned to avoid hijacking.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.has_role(variadic roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select role = any (roles) from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role('owner', 'order_manager', 'catalog_manager');
$$;

-- ----------------------------------------------------- admin audit trail
create table public.admin_logs (
  id          bigint generated always as identity primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  table_name  text,
  record_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index admin_logs_created_at_idx on public.admin_logs (created_at desc);
create index admin_logs_actor_idx on public.admin_logs (actor_id);

-- Generic row-level audit trigger (attached to sensitive tables later).
-- Never attach it to tables holding secrets.
create or replace function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_row jsonb;
begin
  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_row := v_old;
  elsif tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_row := v_new;
  else
    v_new := to_jsonb(new);
    v_row := v_new;
  end if;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    coalesce(v_row ->> 'id', v_row ->> 'key'),
    jsonb_build_object('old', v_old, 'new', v_new)
  );
  return null;
end;
$$;

-- ------------------------------------------------- new-user profile trigger
-- The role is NEVER read from user metadata; every signup is a customer.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, left(new.raw_user_meta_data ->> 'full_name', 120))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backstop: privileged profile fields cannot be changed from the client.
-- (Column grants in the grants migration already block this; the trigger
-- protects against future grant mistakes.) auth.uid() is NULL for the
-- service role and direct SQL, which are trusted.
create or replace function public.guard_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and coalesce(current_setting('app.trusted_role_change', true), '') <> 'on' then
    if new.role is distinct from old.role
       or new.email is distinct from old.email
       or new.id is distinct from old.id then
      raise exception 'forbidden_profile_change' using errcode = '42501';
    end if;
  end if;

  new.phone := coalesce(public.normalize_bd_phone(new.phone), new.phone);

  if new.role is distinct from old.role then
    insert into public.admin_logs (actor_id, action, table_name, record_id, details)
    values (auth.uid(), 'change_role', 'profiles', new.id::text,
            jsonb_build_object('from', old.role, 'to', new.role));
  end if;
  return new;
end;
$$;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_fields();

-- ---------------------------------------------------------------- addresses
create table public.addresses (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  recipient_name         text not null check (length(btrim(recipient_name)) between 1 and 120),
  phone                  text not null,
  district               text not null check (length(btrim(district)) between 1 and 80),
  city_or_area           text not null check (length(btrim(city_or_area)) between 1 and 120),
  postal_code            text check (postal_code is null or length(postal_code) <= 12),
  address_line           text not null check (length(btrim(address_line)) between 1 and 300),
  delivery_instructions  text check (delivery_instructions is null or length(delivery_instructions) <= 300),
  is_default             boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint addresses_phone_format check (phone ~ '^\+8801[3-9][0-9]{8}$')
);
create index addresses_user_idx on public.addresses (user_id);
create unique index addresses_one_default_per_user
  on public.addresses (user_id) where is_default;

create or replace function public.addresses_prepare()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.phone := coalesce(public.normalize_bd_phone(new.phone), new.phone);
  -- Only one default address per user: clear the previous default first.
  if new.is_default then
    update public.addresses
       set is_default = false
     where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_prepare_trg
  before insert or update on public.addresses
  for each row execute function public.addresses_prepare();

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------- RLS
alter table public.profiles   enable row level security;
alter table public.addresses  enable row level security;
alter table public.admin_logs enable row level security;

create policy "profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

-- Customer contact data is visible only to roles that fulfil orders.
create policy "profiles: staff read"
  on public.profiles for select
  using (public.has_role('owner', 'order_manager'));

create policy "profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "addresses: manage own"
  on public.addresses for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "addresses: staff read"
  on public.addresses for select
  using (public.has_role('owner', 'order_manager'));

create policy "admin_logs: owner read"
  on public.admin_logs for select
  using (public.has_role('owner'));
