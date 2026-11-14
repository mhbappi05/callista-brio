begin;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000f1', 'owner@test.local'),
  ('00000000-0000-0000-0000-0000000000c1', 'cust@test.local');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000f1';

insert into public.products (id, name, slug, price, stock_quantity)
values ('00000000-0000-0000-0000-000000000021', 'Pay test', 'pay-test', 500, 10);
insert into public.delivery_zones (code, name, fee, is_fallback) values ('p_all', 'P zone', 100, true);
update public.store_settings
   set value = '{"cod": true, "bkash_manual": false, "nagad_manual": false, "gateway": true}'::jsonb
 where key = 'payment_methods';

-- order total = 500 + 100 = 600
set local role service_role;
select lives_ok($$
  select public.create_order(jsonb_build_object(
    'idempotency_key', 'pay-1',
    'customer', jsonb_build_object('name', 'P', 'phone', '01712345678'),
    'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'X', 'address_line', 'X'),
    'payment_method', 'gateway',
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000021', 'quantity', 1))))
$$, 'gateway order created');
reset role;

update public.payments
   set provider = 'testgw', provider_reference = 'ref-1'
 where order_id = (select id from public.orders where idempotency_key = 'pay-1');

set local role service_role;

select is(
  public.apply_gateway_result(jsonb_build_object('provider','testgw','event_id','e1','provider_reference','ref-1',
    'status','paid','amount',1,'currency','BDT')) ->> 'outcome',
  'amount_mismatch', 'wrong amount is flagged');

reset role;
select is((select status from public.payments where provider_reference = 'ref-1'),
  'requires_review', 'mismatch moves payment to requires_review');
set local role service_role;

select is(
  public.apply_gateway_result(jsonb_build_object('provider','testgw','event_id','e1','provider_reference','ref-1',
    'status','paid','amount',1,'currency','BDT')) ->> 'outcome',
  'replayed', 'same event id is ignored (idempotent)');

select is(
  public.apply_gateway_result(jsonb_build_object('provider','testgw','event_id','e2','provider_reference','ref-1',
    'status','paid','amount',600,'currency','BDT')) ->> 'outcome',
  'paid', 'correct amount marks the payment paid');

select is(
  public.apply_gateway_result(jsonb_build_object('provider','testgw','event_id','e3','provider_reference','ref-1',
    'status','failed','amount',600,'currency','BDT')) ->> 'outcome',
  'ignored', 'a late failure cannot undo a paid payment');

select is(
  public.apply_gateway_result(jsonb_build_object('provider','testgw','event_id','e4','provider_reference','nope',
    'status','paid','amount',600,'currency','BDT')) ->> 'outcome',
  'unknown_payment', 'unknown reference is reported, not applied');

reset role;

-- customer cannot use privileged functions
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000c1","role":"authenticated"}', true); end $$;
set local role authenticated;

select throws_ok($$ select public.apply_gateway_result('{}'::jsonb) $$,
  '42501', null, 'customer cannot call apply_gateway_result');
select throws_ok(
  $$ select public.admin_request_refund((select id from public.payments limit 1), 100) $$,
  '42501', null, 'customer cannot request refunds');

reset role;

-- owner refund flow
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000f1","role":"authenticated"}', true); end $$;
set local role authenticated;

select throws_ok(
  $$ select public.admin_request_refund((select id from public.payments where provider_reference = 'ref-1'), 700) $$,
  'P0001', 'refund_exceeds_payment', 'refund cannot exceed the payment');

select lives_ok(
  $$ select public.admin_request_refund((select id from public.payments where provider_reference = 'ref-1'), 200, 'test') $$,
  'refund of 200 can be requested');
select lives_ok($$ select public.admin_process_refund((select id from public.refunds where amount = 200), 'approve') $$,
  'owner approves the refund');
select lives_ok($$ select public.admin_process_refund((select id from public.refunds where amount = 200), 'mark_processed') $$,
  'owner marks the refund processed');
select is((select status from public.payments where provider_reference = 'ref-1'),
  'partially_refunded', 'payment becomes partially_refunded');

select lives_ok(
  $$ select public.admin_request_refund((select id from public.payments where provider_reference = 'ref-1'), 400) $$,
  'the remaining 400 can be requested');
select lives_ok($$ select public.admin_process_refund((select id from public.refunds where amount = 400), 'approve') $$,
  'second refund approved');
select lives_ok($$ select public.admin_process_refund((select id from public.refunds where amount = 400), 'mark_processed') $$,
  'second refund processed');
select is((select status from public.payments where provider_reference = 'ref-1'),
  'refunded', 'fully refunded payment becomes refunded');

select * from finish();
rollback;