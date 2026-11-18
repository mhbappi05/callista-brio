-- 10. Order quoting and rate limiting
-- * rate_limit_hits + check_rate_limit(): used by the Edge Functions to slow down abuse
-- * quote_order(): read-only price preview for checkout (same rules as create_order)
-- * payment_instructions setting (owner-editable text shown at checkout)

-- ---------------------------------------------------------------- rate limits
create table public.rate_limit_hits (
  id          bigint generated always as identity primary key,
  key         text not null,
  created_at  timestamptz not null default now()
);
create index rate_limit_hits_key_idx     on public.rate_limit_hits (key, created_at desc);
create index rate_limit_hits_created_idx on public.rate_limit_hits (created_at);

alter table public.rate_limit_hits enable row level security;   -- no policies: service role only
revoke all on public.rate_limit_hits from anon, authenticated;

-- Returns true if the call is allowed (and records it), false if over the limit.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if random() < 0.02 then
    delete from public.rate_limit_hits where created_at < now() - interval '1 day';
  end if;

  select count(*) into v_count
    from public.rate_limit_hits
   where key = p_key
     and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.rate_limit_hits (key) values (p_key);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, integer, integer) to service_role;

-- ---------------------------------------------------------------- quote_order
-- Read-only pricing preview. Same rules as create_order, but it takes no locks
-- and writes nothing. create_order remains the authority at order time.
-- Input: { items:[{product_id,variant_id,quantity}], address:{district},
--          coupon_code, phone, user_id }
create or replace function public.quote_order(p jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_district   text := left(btrim(coalesce(p -> 'address' ->> 'district', '')), 80);
  v_user       uuid := nullif(p ->> 'user_id', '')::uuid;
  v_phone      text := public.normalize_bd_phone(p ->> 'phone');

  v_line       record;
  v_prod       public.products;
  v_var        public.product_variants;
  v_lines      jsonb := '[]'::jsonb;
  v_unit       numeric(10,2);
  v_stock      integer;
  v_subtotal   numeric(10,2) := 0;

  v_zone       public.delivery_zones;
  v_zone_json  jsonb;
  v_fee        numeric(10,2);

  v_code       text := upper(btrim(coalesce(p ->> 'coupon_code', '')));
  v_coupon     public.coupons;
  v_discount   numeric(10,2) := 0;
  v_used       integer;
begin
  if jsonb_typeof(p -> 'items') is distinct from 'array' then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p -> 'items') not between 1 and 50 then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;
  if exists (
    select 1
      from jsonb_to_recordset(p -> 'items') as x(product_id uuid, variant_id uuid, quantity integer)
     where x.product_id is null or x.quantity is null or x.quantity < 1 or x.quantity > 20
  ) then
    raise exception 'invalid_items' using errcode = 'P0001';
  end if;

  for v_line in
    select x.product_id, x.variant_id, sum(x.quantity)::integer as qty
      from jsonb_to_recordset(p -> 'items') as x(product_id uuid, variant_id uuid, quantity integer)
     group by x.product_id, x.variant_id
     order by x.product_id, x.variant_id
  loop
    select * into v_prod from public.products where id = v_line.product_id;
    if not found or not v_prod.is_active then
      raise exception 'product_unavailable' using errcode = 'P0001',
        detail = jsonb_build_object('product_id', v_line.product_id)::text;
    end if;

    if v_prod.has_variants then
      select * into v_var from public.product_variants
       where id = v_line.variant_id and product_id = v_prod.id;
      if not found or not v_var.is_active then
        raise exception 'variant_unavailable' using errcode = 'P0001',
          detail = jsonb_build_object('product_id', v_prod.id, 'variant_id', v_line.variant_id)::text;
      end if;
      v_unit  := coalesce(v_var.price, v_prod.discount_price, v_prod.price);
      v_stock := v_var.stock_quantity;
    else
      if v_line.variant_id is not null then
        raise exception 'variant_unavailable' using errcode = 'P0001',
          detail = jsonb_build_object('product_id', v_prod.id, 'variant_id', v_line.variant_id)::text;
      end if;
      v_unit  := coalesce(v_prod.discount_price, v_prod.price);
      v_stock := v_prod.stock_quantity;
    end if;

    if v_stock < v_line.qty then
      raise exception 'insufficient_stock' using errcode = 'P0001',
        detail = jsonb_build_object('product_id', v_prod.id, 'variant_id', v_line.variant_id,
                                    'available', v_stock, 'requested', v_line.qty)::text;
    end if;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'variant_id', case when v_prod.has_variants then v_var.id end,
      'quantity', v_line.qty,
      'unit_price', v_unit,
      'line_total', v_unit * v_line.qty
    );
    v_subtotal := v_subtotal + v_unit * v_line.qty;
  end loop;

  -- Delivery fee, once a district is known
  if v_district <> '' then
    select * into v_zone
      from public.delivery_zones z
     where z.is_active
       and exists (select 1 from unnest(z.districts) d where lower(btrim(d)) = lower(v_district))
     order by z.display_order
     limit 1;
    if not found then
      select * into v_zone from public.delivery_zones where is_active and is_fallback limit 1;
    end if;
    if not found then
      raise exception 'delivery_unavailable' using errcode = 'P0001';
    end if;
    v_fee := v_zone.fee;
    if v_zone.free_delivery_threshold is not null and v_subtotal >= v_zone.free_delivery_threshold then
      v_fee := 0;
    end if;
    v_zone_json := jsonb_build_object(
      'code', v_zone.code, 'name', v_zone.name,
      'fee', v_zone.fee, 'free_delivery_threshold', v_zone.free_delivery_threshold);
  end if;

  -- Coupon (validated, never redeemed here)
  if v_code <> '' then
    select * into v_coupon
      from public.coupons
     where code = v_code
       and is_active
       and (starts_at is null or starts_at <= now())
       and (expires_at is null or expires_at > now());
    if not found then
      raise exception 'invalid_coupon' using errcode = 'P0001';
    end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'coupon_min_order_not_met' using errcode = 'P0001';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'coupon_exhausted' using errcode = 'P0001';
    end if;
    if v_user is not null or v_phone is not null then
      select count(*) into v_used
        from public.coupon_usages cu
       where cu.coupon_id = v_coupon.id
         and ((v_user is not null and cu.user_id = v_user)
              or (v_phone is not null and cu.customer_phone = v_phone));
      if v_used >= v_coupon.per_customer_limit then
        raise exception 'coupon_already_used' using errcode = 'P0001';
      end if;
    end if;

    if v_coupon.discount_type = 'percentage' then
      v_discount := round(v_subtotal * v_coupon.discount_value / 100, 2);
    else
      v_discount := v_coupon.discount_value;
    end if;
    if v_coupon.max_discount_amount is not null then
      v_discount := least(v_discount, v_coupon.max_discount_amount);
    end if;
    v_discount := least(v_discount, v_subtotal);
  end if;

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'delivery_fee', v_fee,
    'discount_total', v_discount,
    'total_amount', v_subtotal - v_discount + coalesce(v_fee, 0),
    'zone', v_zone_json,
    'coupon_code', case when v_coupon.id is not null then v_coupon.code end,
    'lines', v_lines
  );
end;
$$;

revoke all on function public.quote_order(jsonb) from public, anon, authenticated;
grant execute on function public.quote_order(jsonb) to service_role;

-- Owner-editable payment instructions shown at checkout (leave blank until you have them).
-- Example value: {"bkash_manual": "Send Money to 01XXXXXXXXX, then enter the TrxID.", "nagad_manual": ""}
insert into public.store_settings (key, value, is_public)
values ('payment_instructions', '{"bkash_manual": "", "nagad_manual": ""}'::jsonb, true)
on conflict (key) do nothing;
