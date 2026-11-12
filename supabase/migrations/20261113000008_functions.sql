-- 8. Trusted functions
--
-- create_order        : called ONLY by the `create-order` Edge Function (service role).
-- admin_*             : callable by signed-in staff; each checks the role internally.
--
-- Error contract: failures are raised with SQLSTATE P0001 and a stable code as
-- the message (e.g. 'insufficient_stock'); extra info is in DETAIL as JSON.
-- The Edge Function maps these codes to HTTP responses.

-- ------------------------------------------------------------- create_order
-- Input (jsonb):
-- {
--   "idempotency_key": "client-generated unique string",
--   "user_id": "uuid | null"           -- set by the Edge Function from the verified JWT
--   "customer": {"name": "", "phone": "", "email": ""},
--   "address":  {"recipient_name": "", "phone": "", "district": "", "city_or_area": "",
--                "postal_code": "", "address_line": "", "delivery_instructions": ""},
--   "payment_method": "cod | bkash_manual | nagad_manual | gateway",
--   "payment": {"transaction_id": "", "sender_phone": ""},   -- manual methods only
--   "coupon_code": "",
--   "note": "",
--   "items": [{"product_id": "uuid", "variant_id": "uuid | null", "quantity": 1}]
-- }
-- Prices, discounts, delivery fee and totals are ALWAYS computed here; any
-- amounts sent by the browser are ignored.
-- Stock policy: stock is deducted when the order is placed and restored on
-- cancellation (carts never reserve stock).
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key        text  := nullif(btrim(p ->> 'idempotency_key'), '');
  v_user       uuid  := nullif(p ->> 'user_id', '')::uuid;
  v_cust       jsonb := p -> 'customer';
  v_addr       jsonb := p -> 'address';
  v_method     text  := p ->> 'payment_method';
  v_methods    jsonb;
  v_name       text;
  v_phone      text;
  v_email      text;
  v_district   text;
  v_city       text;
  v_line_addr  text;
  v_snapshot   jsonb;

  v_existing   public.orders;
  v_line       record;
  v_prod       public.products;
  v_var        public.product_variants;
  v_lines      jsonb := '[]'::jsonb;
  v_item       jsonb;
  v_unit       numeric(10,2);
  v_stock      integer;
  v_subtotal   numeric(10,2) := 0;
  v_image      text;

  v_zone       public.delivery_zones;
  v_fee        numeric(10,2);

  v_code       text := upper(btrim(coalesce(p ->> 'coupon_code', '')));
  v_coupon     public.coupons;
  v_discount   numeric(10,2) := 0;
  v_used       integer;

  v_order      public.orders;
begin
  -- Idempotent replay: same key returns the original order untouched.
  if v_key is not null then
    select * into v_existing from public.orders where idempotency_key = v_key;
    if found then
      return jsonb_build_object(
        'order_id', v_existing.id, 'order_number', v_existing.order_number,
        'total_amount', v_existing.total_amount, 'payment_status', v_existing.payment_status,
        'replayed', true);
    end if;
  end if;

  -- Payment method must be known and currently enabled by the owner.
  select value into v_methods from public.store_settings where key = 'payment_methods';
  if v_method is null or coalesce((v_methods ->> v_method)::boolean, false) is not true then
    raise exception 'payment_method_unavailable' using errcode = 'P0001';
  end if;

  -- Contact details
  v_name  := left(btrim(coalesce(v_cust ->> 'name', '')), 120);
  v_phone := public.normalize_bd_phone(v_cust ->> 'phone');
  v_email := nullif(lower(btrim(coalesce(v_cust ->> 'email', ''))), '');
  if v_name = '' then
    raise exception 'invalid_name' using errcode = 'P0001';
  end if;
  if v_phone is null or v_phone !~ '^\+8801[3-9][0-9]{8}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+$' then
    raise exception 'invalid_email' using errcode = 'P0001';
  end if;

  -- Address
  v_district  := left(btrim(coalesce(v_addr ->> 'district', '')), 80);
  v_city      := left(btrim(coalesce(v_addr ->> 'city_or_area', '')), 120);
  v_line_addr := left(btrim(coalesce(v_addr ->> 'address_line', '')), 300);
  if v_district = '' or v_city = '' or v_line_addr = '' then
    raise exception 'invalid_address' using errcode = 'P0001';
  end if;
  v_snapshot := jsonb_build_object(
    'recipient_name', coalesce(nullif(left(btrim(coalesce(v_addr ->> 'recipient_name', '')), 120), ''), v_name),
    'phone', coalesce(public.normalize_bd_phone(v_addr ->> 'phone'), v_phone),
    'district', v_district,
    'city_or_area', v_city,
    'postal_code', nullif(left(btrim(coalesce(v_addr ->> 'postal_code', '')), 12), ''),
    'address_line', v_line_addr,
    'delivery_instructions', nullif(left(btrim(coalesce(v_addr ->> 'delivery_instructions', '')), 300), '')
  );

  -- Items: shape validation
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

  -- Pass 1: lock rows in a fixed order (prevents deadlocks), validate, price.
  for v_line in
    select x.product_id, x.variant_id, sum(x.quantity)::integer as qty
      from jsonb_to_recordset(p -> 'items') as x(product_id uuid, variant_id uuid, quantity integer)
     group by x.product_id, x.variant_id
     order by x.product_id, x.variant_id
  loop
    select * into v_prod from public.products where id = v_line.product_id for update;
    if not found or not v_prod.is_active then
      raise exception 'product_unavailable' using errcode = 'P0001',
        detail = jsonb_build_object('product_id', v_line.product_id)::text;
    end if;

    if v_prod.has_variants then
      select * into v_var from public.product_variants
       where id = v_line.variant_id and product_id = v_prod.id for update;
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

    select storage_path into v_image
      from public.product_images
     where product_id = v_prod.id
     order by is_primary desc, display_order asc
     limit 1;

    v_lines := v_lines || jsonb_build_object(
      'product_id', v_prod.id,
      'variant_id', case when v_prod.has_variants then v_var.id end,
      'product_name', v_prod.name,
      'sku', case when v_prod.has_variants then coalesce(v_var.sku, v_prod.sku) else v_prod.sku end,
      'variant_description', case when v_prod.has_variants then v_var.name end,
      'product_image', v_image,
      'quantity', v_line.qty,
      'unit_price', v_unit,
      'line_total', v_unit * v_line.qty
    );
    v_subtotal := v_subtotal + v_unit * v_line.qty;
  end loop;

  -- Delivery zone and fee (owner-configured; nothing hard-coded).
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

  -- Coupon (optional)
  if v_code <> '' then
    select * into v_coupon
      from public.coupons
     where code = v_code
       and is_active
       and (starts_at is null or starts_at <= now())
       and (expires_at is null or expires_at > now())
     for update;
    if not found then
      raise exception 'invalid_coupon' using errcode = 'P0001';
    end if;
    if v_subtotal < v_coupon.min_order_amount then
      raise exception 'coupon_min_order_not_met' using errcode = 'P0001';
    end if;
    if v_coupon.usage_limit is not null and v_coupon.used_count >= v_coupon.usage_limit then
      raise exception 'coupon_exhausted' using errcode = 'P0001';
    end if;
    select count(*) into v_used
      from public.coupon_usages cu
     where cu.coupon_id = v_coupon.id
       and ((v_user is not null and cu.user_id = v_user) or cu.customer_phone = v_phone);
    if v_used >= v_coupon.per_customer_limit then
      raise exception 'coupon_already_used' using errcode = 'P0001';
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

  -- Order header
  insert into public.orders (
    user_id, idempotency_key, customer_name, customer_phone, customer_email, customer_note,
    shipping_address, delivery_zone_code, delivery_zone_name, delivery_fee,
    subtotal, discount_total, total_amount, coupon_id, coupon_code, payment_method
  ) values (
    v_user, v_key, v_name, v_phone, v_email, nullif(left(btrim(coalesce(p ->> 'note', '')), 500), ''),
    v_snapshot, v_zone.code, v_zone.name, v_fee,
    v_subtotal, v_discount, v_subtotal - v_discount + v_fee,
    v_coupon.id, nullif(v_code, ''), v_method
  ) returning * into v_order;

  -- Pass 2: item snapshots, stock deduction, inventory log
  for v_item in select * from jsonb_array_elements(v_lines)
  loop
    insert into public.order_items (
      order_id, product_id, variant_id, product_name, sku, variant_description,
      product_image, quantity, unit_price, line_total
    ) values (
      v_order.id,
      (v_item ->> 'product_id')::uuid,
      nullif(v_item ->> 'variant_id', '')::uuid,
      v_item ->> 'product_name',
      v_item ->> 'sku',
      v_item ->> 'variant_description',
      v_item ->> 'product_image',
      (v_item ->> 'quantity')::integer,
      (v_item ->> 'unit_price')::numeric,
      (v_item ->> 'line_total')::numeric
    );

    if nullif(v_item ->> 'variant_id', '') is not null then
      update public.product_variants
         set stock_quantity = stock_quantity - (v_item ->> 'quantity')::integer
       where id = (v_item ->> 'variant_id')::uuid;
    else
      update public.products
         set stock_quantity = stock_quantity - (v_item ->> 'quantity')::integer
       where id = (v_item ->> 'product_id')::uuid;
    end if;

    insert into public.inventory_logs (product_id, variant_id, quantity_change, reason, order_id)
    values ((v_item ->> 'product_id')::uuid,
            nullif(v_item ->> 'variant_id', '')::uuid,
            -((v_item ->> 'quantity')::integer),
            'order_placed', v_order.id);
  end loop;

  -- Coupon redemption
  if v_coupon.id is not null then
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
    insert into public.coupon_usages (coupon_id, order_id, user_id, customer_phone, discount_amount)
    values (v_coupon.id, v_order.id, v_user, v_phone, v_discount);
  end if;

  -- Payment record (COD stays unpaid until cash is collected; manual awaits verification)
  insert into public.payments (order_id, method, amount, status, manual_transaction_id, manual_sender_phone)
  values (
    v_order.id, v_method, v_order.total_amount,
    case when v_method = 'cod' then 'unpaid' else 'pending' end,
    case when v_method in ('bkash_manual', 'nagad_manual')
         then nullif(btrim(coalesce(p -> 'payment' ->> 'transaction_id', '')), '') end,
    case when v_method in ('bkash_manual', 'nagad_manual')
         then public.normalize_bd_phone(p -> 'payment' ->> 'sender_phone') end
  );

  if v_user is not null then
    insert into public.notifications (user_id, type, title, data)
    values (v_user, 'order_placed', 'Order ' || v_order.order_number || ' placed',
            jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number));
  end if;

  select * into v_order from public.orders where id = v_order.id;
  return jsonb_build_object(
    'order_id', v_order.id, 'order_number', v_order.order_number,
    'total_amount', v_order.total_amount, 'payment_status', v_order.payment_status,
    'replayed', false);
end;
$$;

-- --------------------------------------------------------- admin functions
create or replace function public.admin_set_order_status(
  p_order_id uuid, p_status text, p_note text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.has_role('owner', 'order_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  perform set_config('app.status_note', coalesce(p_note, ''), true);
  update public.orders set order_status = p_status where id = p_order_id returning * into v_order;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'set_order_status', 'orders', p_order_id::text,
          jsonb_build_object('status', p_status, 'note', p_note));
  return v_order;
end;
$$;

create or replace function public.admin_update_tracking(
  p_order_id uuid, p_courier_name text, p_tracking_number text, p_tracking_url text default null)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  if not public.has_role('owner', 'order_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_tracking_url is not null and p_tracking_url !~* '^https?://' then
    raise exception 'invalid_tracking_url' using errcode = 'P0001';
  end if;

  update public.orders
     set courier_name = nullif(btrim(p_courier_name), ''),
         tracking_number = nullif(btrim(p_tracking_number), ''),
         tracking_url = nullif(btrim(p_tracking_url), '')
   where id = p_order_id
   returning * into v_order;
  if not found then
    raise exception 'order_not_found' using errcode = 'P0002';
  end if;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'update_tracking', 'orders', p_order_id::text,
          jsonb_build_object('courier', p_courier_name, 'tracking_number', p_tracking_number));
  return v_order;
end;
$$;

-- Manual (bKash/Nagad) verification, or confirming COD cash collection.
create or replace function public.admin_verify_payment(
  p_payment_id uuid, p_approved boolean, p_note text default null)
returns public.payments
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pay public.payments;
begin
  if not public.has_role('owner', 'order_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'payment_not_found' using errcode = 'P0002';
  end if;
  if v_pay.method = 'gateway' then
    raise exception 'gateway_payments_are_webhook_verified' using errcode = 'P0001';
  end if;
  if v_pay.status in ('paid', 'partially_refunded', 'refunded') then
    raise exception 'payment_already_final' using errcode = 'P0001';
  end if;

  update public.payments
     set status = case when p_approved then 'paid' else 'failed' end,
         verified_by = auth.uid(),
         verified_at = now(),
         verification_metadata = verification_metadata
                                 || jsonb_build_object('note', p_note, 'approved', p_approved)
   where id = p_payment_id
   returning * into v_pay;

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'verify_payment', 'payments', p_payment_id::text,
          jsonb_build_object('approved', p_approved, 'note', p_note));
  return v_pay;
end;
$$;

-- Manual stock adjustment. Returns the new quantity.
create or replace function public.admin_adjust_stock(
  p_product_id uuid, p_variant_id uuid, p_change integer, p_reason text, p_note text default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new integer;
  v_has_variants boolean;
begin
  if not public.has_role('owner', 'catalog_manager') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_change is null or p_change = 0 then
    raise exception 'invalid_change' using errcode = 'P0001';
  end if;
  if p_reason not in ('initial_stock', 'manual_adjustment', 'correction', 'return_restock') then
    raise exception 'invalid_reason' using errcode = 'P0001';
  end if;

  select has_variants into v_has_variants from public.products where id = p_product_id for update;
  if not found then
    raise exception 'product_not_found' using errcode = 'P0002';
  end if;

  if v_has_variants then
    if p_variant_id is null then
      raise exception 'variant_required' using errcode = 'P0001';
    end if;
    update public.product_variants
       set stock_quantity = stock_quantity + p_change
     where id = p_variant_id and product_id = p_product_id
     returning stock_quantity into v_new;
  else
    if p_variant_id is not null then
      raise exception 'variant_not_applicable' using errcode = 'P0001';
    end if;
    update public.products
       set stock_quantity = stock_quantity + p_change
     where id = p_product_id
     returning stock_quantity into v_new;
  end if;
  if not found then
    raise exception 'variant_not_found' using errcode = 'P0002';
  end if;
  -- A result below zero violates the stock_quantity >= 0 check and aborts.

  insert into public.inventory_logs (product_id, variant_id, quantity_change, reason, actor_id, note)
  values (p_product_id, p_variant_id, p_change, p_reason, auth.uid(), p_note);

  insert into public.admin_logs (actor_id, action, table_name, record_id, details)
  values (auth.uid(), 'adjust_stock', 'products', p_product_id::text,
          jsonb_build_object('variant_id', p_variant_id, 'change', p_change,
                             'reason', p_reason, 'new_quantity', v_new));
  return v_new;
end;
$$;

-- Owner-only role assignment (customers can never change roles).
create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_role('owner') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_role not in ('customer', 'owner', 'order_manager', 'catalog_manager') then
    raise exception 'invalid_role' using errcode = 'P0001';
  end if;
  if p_user_id = auth.uid() and p_role <> 'owner' then
    raise exception 'cannot_demote_self' using errcode = 'P0001';
  end if;

  -- The profile guard trigger blocks client role changes unless this
  -- transaction-local flag is set. Only this function sets it.
  perform set_config('app.trusted_role_change', 'on', true);
  update public.profiles set role = p_role where id = p_user_id;
  perform set_config('app.trusted_role_change', '', true);
end;
$$;

-- -------------------------------------------------------------- privileges
-- Supabase grants EXECUTE on new functions to anon/authenticated by default,
-- so revoke explicitly and re-grant only what each function needs.
revoke all on function public.create_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb) to service_role;

revoke all on function public.restore_order_stock(uuid, text) from public, anon, authenticated;
grant execute on function public.restore_order_stock(uuid, text) to service_role;

revoke all on function public.admin_set_order_status(uuid, text, text) from public, anon;
revoke all on function public.admin_update_tracking(uuid, text, text, text) from public, anon;
revoke all on function public.admin_verify_payment(uuid, boolean, text) from public, anon;
revoke all on function public.admin_adjust_stock(uuid, uuid, integer, text, text) from public, anon;
revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;
grant execute on function public.admin_update_tracking(uuid, text, text, text) to authenticated;
grant execute on function public.admin_verify_payment(uuid, boolean, text) to authenticated;
grant execute on function public.admin_adjust_stock(uuid, uuid, integer, text, text) to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
