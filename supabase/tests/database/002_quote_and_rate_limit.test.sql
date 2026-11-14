begin;
select plan(10);

insert into public.products (id, name, slug, price, stock_quantity)
values ('00000000-0000-0000-0000-000000000011', 'Quote test', 'q-test', 500, 10);
insert into public.delivery_zones (code, name, fee, is_fallback) values ('q_all', 'Q zone', 100, true);
insert into public.coupons (code, discount_type, discount_value)
values ('SAVE10', 'percentage', 10);
update public.store_settings
   set value = '{"cod": true, "bkash_manual": false, "nagad_manual": false, "gateway": false}'::jsonb
 where key = 'payment_methods';

do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role anon;
select throws_ok($$ select public.quote_order('{}'::jsonb) $$, '42501', null, 'anon cannot call quote_order');
reset role;

set local role service_role;

select is(
  (public.quote_order(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000011', 'quantity', 2)),
    'address', jsonb_build_object('district', 'Dhaka'), 'coupon_code', 'save10'
  )) ->> 'total_amount')::numeric,
  1000.00::numeric, 'quote: 2 x 500 - 10% + 100 delivery = 1000');

select is(
  (public.quote_order(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000011', 'quantity', 2)),
    'address', jsonb_build_object('district', 'Dhaka'), 'coupon_code', 'SAVE10'
  )) ->> 'discount_total')::numeric,
  100.00::numeric, 'quote: discount is 10% of subtotal');

select is(
  public.quote_order(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000011', 'quantity', 1))
  )) -> 'delivery_fee',
  'null'::jsonb, 'quote: no district means no delivery fee yet');

select throws_ok($$
  select public.quote_order(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000011', 'quantity', 1)),
    'coupon_code', 'NOPE'))
$$, 'P0001', 'invalid_coupon', 'quote rejects unknown coupons');

select throws_ok($$
  select public.quote_order(jsonb_build_object(
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000011', 'quantity', 11))))
$$, 'P0001', 'insufficient_stock', 'quote rejects quantities above stock');

-- quote and create_order must agree
select is(
  (public.create_order(jsonb_build_object(
    'idempotency_key', 'quote-match-1',
    'customer', jsonb_build_object('name', 'Q', 'phone', '01712345678'),
    'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'X', 'address_line', 'X'),
    'payment_method', 'cod', 'coupon_code', 'SAVE10',
    'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000011', 'quantity', 2))
  )) ->> 'total_amount')::numeric,
  1000.00::numeric, 'create_order total matches the quote');

select is(public.check_rate_limit('t', 2, 60), true,  'rate limit: first call allowed');
select is(public.check_rate_limit('t', 2, 60), true,  'rate limit: second call allowed');
select is(public.check_rate_limit('t', 2, 60), false, 'rate limit: third call blocked');

select * from finish();
rollback;