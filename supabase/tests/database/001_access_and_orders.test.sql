-- Run with: supabase test db
-- Covers the Phase 3 completion criterion: access rules hold, and orders are
-- created atomically without overselling.
begin;
select plan(25);

-- ------------------------------------------------------------------ fixtures
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.local');

insert into public.products (id, name, slug, price, stock_quantity, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'Test active', 't-active', 500, 10, true),
  ('00000000-0000-0000-0000-000000000002', 'Test hidden', 't-hidden', 500, 10, false);

insert into public.delivery_zones (code, name, fee, is_fallback)
values ('test_all', 'Test zone', 100, true);

update public.store_settings
   set value = '{"cod": true, "bkash_manual": false, "nagad_manual": false, "gateway": false}'::jsonb
 where key = 'payment_methods';

-- ---------------------------------------------------------------- anonymous
do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role anon;

select is(
  (select count(*)::int from public.products where slug in ('t-active', 't-hidden')),
  1, 'anon sees only active products');

select throws_ok(
  $$ select public.create_order('{}'::jsonb) $$,
  '42501', null, 'anon cannot call create_order');

reset role;

-- ------------------------------------------------------ order creation (service)
set local role service_role;

select lives_ok($$
  select public.create_order(jsonb_build_object(
    'idempotency_key', 'k-a1',
    'user_id', '00000000-0000-0000-0000-0000000000a1',
    'customer', jsonb_build_object('name', 'A Customer', 'phone', '01712345678'),
    'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'Dhanmondi',
                                  'address_line', 'House 1, Road 2'),
    'payment_method', 'cod',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000001', 'quantity', 2))))
$$, 'service role can create an order');

reset role;

select is(
  (select stock_quantity from public.products where id = '00000000-0000-0000-0000-000000000001'),
  8, 'stock is deducted when the order is placed');

select is(
  (select total_amount from public.orders where idempotency_key = 'k-a1'),
  1100.00::numeric, 'server computes total: 2 x 500 + 100 delivery');

set local role service_role;

select is(
  (select (public.create_order(jsonb_build_object(
    'idempotency_key', 'k-a1',
    'user_id', '00000000-0000-0000-0000-0000000000a1',
    'customer', jsonb_build_object('name', 'A Customer', 'phone', '01712345678'),
    'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'Dhanmondi',
                                  'address_line', 'House 1, Road 2'),
    'payment_method', 'cod',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000001', 'quantity', 2)))) ->> 'replayed')::boolean),
  true, 'same idempotency key replays the original order');

reset role;

select is(
  (select stock_quantity from public.products where id = '00000000-0000-0000-0000-000000000001'),
  8, 'replay does not deduct stock again');

set local role service_role;

select throws_ok($$
  select public.create_order(jsonb_build_object(
    'idempotency_key', 'k-big',
    'customer', jsonb_build_object('name', 'X', 'phone', '01712345678'),
    'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'X', 'address_line', 'X'),
    'payment_method', 'cod',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000001', 'quantity', 9))))
$$, 'P0001', 'insufficient_stock', 'cannot oversell');

select throws_ok($$
  select public.create_order(jsonb_build_object(
    'idempotency_key', 'k-hidden',
    'customer', jsonb_build_object('name', 'X', 'phone', '01712345678'),
    'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'X', 'address_line', 'X'),
    'payment_method', 'cod',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000002', 'quantity', 1))))
$$, 'P0001', 'product_unavailable', 'inactive product cannot be ordered');

select lives_ok($$
  select public.create_order(jsonb_build_object(
    'idempotency_key', 'k-b1',
    'user_id', '00000000-0000-0000-0000-0000000000b1',
    'customer', jsonb_build_object('name', 'B Customer', 'phone', '01812345678'),
    'address', jsonb_build_object('district', 'Chattogram', 'city_or_area', 'Agrabad',
                                  'address_line', 'Flat 3'),
    'payment_method', 'cod',
    'items', jsonb_build_array(jsonb_build_object(
      'product_id', '00000000-0000-0000-0000-000000000001', 'quantity', 1))))
$$, 'second customer can create an order');

reset role;

-- ------------------------------------------------------ customer A (authenticated)
do $$ begin
  perform set_config('request.jwt.claims',
    '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
end $$;
set local role authenticated;

select is((select count(*)::int from public.orders), 1,
  'customer sees only their own orders');

select is((select count(*)::int from public.my_payments), 1,
  'customer sees their own payment summary');

select is((select count(*)::int from public.profiles
            where id = '00000000-0000-0000-0000-0000000000b1'), 0,
  'customer cannot read another profile');

select throws_ok(
  $$ update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000a1' $$,
  '42501', null, 'customer cannot promote themselves');

select throws_ok(
  $$ insert into public.orders (customer_name, customer_phone, shipping_address, delivery_zone_code,
                                delivery_zone_name, delivery_fee, subtotal, total_amount, payment_method)
     values ('X', '+8801712345678', '{}', 'z', 'z', 0, 1, 1, 'cod') $$,
  '42501', null, 'customer cannot insert orders directly');

select throws_ok(
  $$ update public.orders set payment_status = 'paid' $$,
  '42501', null, 'customer cannot modify orders');

select throws_ok(
  $$ update public.payments set status = 'paid' $$,
  '42501', null, 'customer cannot modify payments');

select throws_ok(
  $$ select public.admin_adjust_stock('00000000-0000-0000-0000-000000000001'::uuid, null::uuid, 5, 'manual_adjustment') $$,
  '42501', null, 'customer cannot adjust stock');

select is((select count(*)::int from public.inventory_logs), 0,
  'customer cannot read inventory logs');

select throws_ok(
  $$ insert into public.reviews (product_id, user_id, order_item_id, rating)
     values ('00000000-0000-0000-0000-000000000001',
             '00000000-0000-0000-0000-0000000000a1',
             (select id from public.order_items limit 1), 5) $$,
  '42501', 'review_not_allowed', 'cannot review before the order is delivered');

reset role;

-- ------------------------------------------------------------ order lifecycle
select throws_ok(
  $$ update public.orders set order_status = 'delivered' where idempotency_key = 'k-a1' $$,
  'P0001', 'invalid_status_transition', 'pending order cannot jump to delivered');

select throws_ok(
  $$ update public.orders set total_amount = 1, subtotal = 1 where idempotency_key = 'k-a1' $$,
  'P0001', 'order_snapshot_immutable', 'order totals cannot be edited after creation');

select lives_ok(
  $$ update public.orders set order_status = 'cancelled' where idempotency_key = 'k-a1' $$,
  'pending order can be cancelled');

select is(
  (select stock_quantity from public.products where id = '00000000-0000-0000-0000-000000000001'),
  9, 'cancellation restores stock (8 + 2 - 1 for the other order)');

select throws_ok(
  $$ update public.orders set order_status = 'pending' where idempotency_key = 'k-a1' $$,
  'P0001', 'invalid_status_transition', 'cancelled orders are terminal');

select * from finish();
rollback;
