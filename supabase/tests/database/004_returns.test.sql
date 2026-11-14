begin;
select plan(13);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000b1', 'b@test.local'),
  ('00000000-0000-0000-0000-0000000000f1', 'owner@test.local');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000f1';

insert into public.products (id, name, slug, price, stock_quantity)
values ('00000000-0000-0000-0000-000000000031', 'Return test', 'return-test', 500, 10);
insert into public.delivery_zones (code, name, fee, is_fallback) values ('r_all', 'R zone', 100, true);
update public.store_settings
   set value = '{"cod": true, "bkash_manual": false, "nagad_manual": false, "gateway": false}'::jsonb
 where key = 'payment_methods';

-- Customer A's order: 2 items, then walk it to delivered
set local role service_role;
select public.create_order(jsonb_build_object(
  'idempotency_key', 'r-1', 'user_id', '00000000-0000-0000-0000-0000000000a1',
  'customer', jsonb_build_object('name', 'A', 'phone', '01712345678'),
  'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'X', 'address_line', 'X'),
  'payment_method', 'cod',
  'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000031', 'quantity', 2))));
reset role;

update public.orders set order_status = 'confirmed'  where idempotency_key = 'r-1';
update public.orders set order_status = 'processing' where idempotency_key = 'r-1';
update public.orders set order_status = 'packed'     where idempotency_key = 'r-1';
update public.orders set order_status = 'shipped'    where idempotency_key = 'r-1';
update public.orders set order_status = 'delivered'  where idempotency_key = 'r-1';

-- Customer A
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true); end $$;
set local role authenticated;

select throws_ok(
  $$ select public.request_return((select id from public.orders where idempotency_key = 'r-1'), 'return', 'Too small',
       jsonb_build_array(jsonb_build_object('order_item_id', (select id from public.order_items limit 1), 'quantity', 1))) $$,
  'P0001', 'returns_unavailable', 'returns are off until the owner configures a window');

reset role;
update public.store_settings set value = '{"enabled": true, "window_days": 7}'::jsonb where key = 'return_policy';

-- Customer B cannot return A's order
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000b1","role":"authenticated"}', true); end $$;
set local role authenticated;
select throws_ok(
  $$ select public.request_return((select id from public.orders where idempotency_key = 'r-1'), 'return', 'Not mine',
       '[{"order_item_id":"00000000-0000-0000-0000-000000000000","quantity":1}]'::jsonb) $$,
  'P0002', 'order_not_found', 'another customer cannot request a return on this order');
reset role;

-- Customer A again
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true); end $$;
set local role authenticated;

select throws_ok(
  $$ select public.request_return((select id from public.orders where idempotency_key = 'r-1'), 'return', 'Too many',
       jsonb_build_array(jsonb_build_object('order_item_id', (select id from public.order_items limit 1), 'quantity', 5))) $$,
  'P0001', 'invalid_items', 'cannot return more than was ordered');

select lives_ok(
  $$ select public.request_return((select id from public.orders where idempotency_key = 'r-1'), 'return', 'Wrong size',
       jsonb_build_array(jsonb_build_object('order_item_id', (select id from public.order_items limit 1), 'quantity', 1))) $$,
  'customer can request a return on a delivered order');

select is((select status from public.return_requests limit 1), 'requested', 'new request starts as requested');

select throws_ok(
  $$ select public.request_return((select id from public.orders where idempotency_key = 'r-1'), 'return', 'Again',
       jsonb_build_array(jsonb_build_object('order_item_id', (select id from public.order_items limit 1), 'quantity', 1))) $$,
  'P0001', 'return_already_open', 'only one open request per order');

select throws_ok(
  $$ insert into public.return_requests (order_id, user_id, reason)
     values ((select id from public.orders where idempotency_key = 'r-1'), '00000000-0000-0000-0000-0000000000a1', 'x') $$,
  '42501', null, 'customers cannot insert return requests directly');

select throws_ok(
  $$ select public.admin_update_return((select id from public.return_requests limit 1), 'approved') $$,
  '42501', null, 'customers cannot approve their own request');

reset role;

-- Owner works the request
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true); end $$;
set local role authenticated;

select lives_ok($$ select public.admin_update_return((select id from public.return_requests limit 1), 'approved', 'Please send it back.') $$,
  'owner approves');
select throws_ok($$ select public.admin_update_return((select id from public.return_requests limit 1), 'completed') $$,
  'P0001', 'invalid_return_state', 'cannot skip from approved to completed');
select lives_ok($$ select public.admin_update_return((select id from public.return_requests limit 1), 'received') $$, 'owner marks received');
select lives_ok($$ select public.admin_update_return((select id from public.return_requests limit 1), 'completed') $$, 'owner completes');

reset role;

-- Window closed: push delivery 30 days into the past, then A tries again
update public.orders set delivered_at = now() - interval '30 days' where idempotency_key = 'r-1';
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true); end $$;
set local role authenticated;
select throws_ok(
  $$ select public.request_return((select id from public.orders where idempotency_key = 'r-1'), 'return', 'Late',
       jsonb_build_array(jsonb_build_object('order_item_id', (select id from public.order_items limit 1), 'quantity', 1))) $$,
  'P0001', 'return_window_closed', 'requests after the window are refused');

select * from finish();
rollback;