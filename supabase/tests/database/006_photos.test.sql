begin;
select plan(16);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000e1', 'a@test.local'),
  ('00000000-0000-0000-0000-0000000000e2', 'b@test.local'),
  ('00000000-0000-0000-0000-0000000000e3', 'owner@test.local');
update public.profiles set role = 'owner' where id = '00000000-0000-0000-0000-0000000000e3';

insert into public.products (id, name, slug, price, stock_quantity)
values ('00000000-0000-0000-0000-000000000041', 'Photo test', 'photo-test', 500, 10);
insert into public.delivery_zones (code, name, fee, is_fallback) values ('ph_all', 'Photo zone', 100, true);
update public.store_settings
   set value = '{"cod": true, "bkash_manual": false, "nagad_manual": false, "gateway": false}'::jsonb
 where key = 'payment_methods';

insert into public.product_images (id, product_id, storage_path, alt_text, display_order, is_primary) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000041', 'seed/1.webp', 'one',   0, true),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-000000000041', 'seed/2.webp', 'two',   1, false),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-000000000041', 'seed/3.webp', 'three', 2, false);

-- Customer A's delivered order
set local role service_role;
select public.create_order(jsonb_build_object(
  'idempotency_key', 'g4-1', 'user_id', '00000000-0000-0000-0000-0000000000e1',
  'customer', jsonb_build_object('name', 'A', 'phone', '01712345678'),
  'address', jsonb_build_object('district', 'Dhaka', 'city_or_area', 'X', 'address_line', 'X'),
  'payment_method', 'cod',
  'items', jsonb_build_array(jsonb_build_object('product_id', '00000000-0000-0000-0000-000000000041', 'quantity', 1))));
reset role;
update public.orders set order_status = 'confirmed'  where idempotency_key = 'g4-1';
update public.orders set order_status = 'processing' where idempotency_key = 'g4-1';
update public.orders set order_status = 'packed'     where idempotency_key = 'g4-1';
update public.orders set order_status = 'shipped'    where idempotency_key = 'g4-1';
update public.orders set order_status = 'delivered'  where idempotency_key = 'g4-1';

-- ----------------------------------------------------------- review photos
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true); end $$;
set local role authenticated;

select lives_ok(
  $$ insert into public.reviews (id, product_id, user_id, order_item_id, rating)
     values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-000000000041',
             '00000000-0000-0000-0000-0000000000e1', (select id from public.order_items limit 1), 5) $$,
  'customer can review a delivered item');

select lives_ok(
  $$ insert into public.review_images (review_id, storage_path) values
     ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1/11111111-1111-1111-1111-111111111111.webp') $$,
  'customer can attach a photo from their own folder');

select throws_ok(
  $$ insert into public.review_images (review_id, storage_path) values
     ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e2/55555555-5555-5555-5555-555555555555.webp') $$,
  '42501', null, 'cannot point a review at another customer''s folder');

select lives_ok(
  $$ insert into public.review_images (review_id, storage_path) values
     ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1/22222222-2222-2222-2222-222222222222.webp') $$,
  'second photo');
select lives_ok(
  $$ insert into public.review_images (review_id, storage_path) values
     ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1/33333333-3333-3333-3333-333333333333.webp') $$,
  'third photo');
select throws_ok(
  $$ insert into public.review_images (review_id, storage_path) values
     ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000e1/44444444-4444-4444-4444-444444444444.webp') $$,
  'P0001', 'too_many_review_images', 'a review holds at most 3 photos');
reset role;

-- Staff approve the review
update public.reviews set status = 'approved' where id = '00000000-0000-0000-0000-0000000000f1';

do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role anon;
select is((select count(*)::int from public.review_images), 3, 'visitors see photos of an approved review');
reset role;

-- The customer removes a photo: the review goes back to moderation
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true); end $$;
set local role authenticated;
select lives_ok(
  $$ delete from public.review_images
      where storage_path = '00000000-0000-0000-0000-0000000000e1/11111111-1111-1111-1111-111111111111.webp' $$,
  'customer can remove their own photo');
reset role;
select is((select status from public.reviews where id = '00000000-0000-0000-0000-0000000000f1'), 'pending',
  'changing photos sends the review back to moderation');

do $$ begin perform set_config('request.jwt.claims', '', true); end $$;
set local role anon;
select is((select count(*)::int from public.review_images), 0, 'visitors see no photos while the review is pending');
reset role;

-- ----------------------------------------------------------- product photos
do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e3","role":"authenticated"}', true); end $$;
set local role authenticated;

select lives_ok(
  $$ select public.admin_reorder_product_images('00000000-0000-0000-0000-000000000041',
       array['00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1',
             '00000000-0000-0000-0000-0000000000c2']::uuid[]) $$,
  'owner can reorder photos');
select is((select id from public.product_images
            where product_id = '00000000-0000-0000-0000-000000000041' and is_primary),
  '00000000-0000-0000-0000-0000000000c3'::uuid, 'the first photo becomes the main photo');
select is((select array_agg(id order by display_order) from public.product_images
            where product_id = '00000000-0000-0000-0000-000000000041'),
  array['00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1',
        '00000000-0000-0000-0000-0000000000c2']::uuid[], 'the new order is saved');
select throws_ok(
  $$ select public.admin_reorder_product_images('00000000-0000-0000-0000-000000000041',
       array['00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000c2']::uuid[]) $$,
  'P0001', 'invalid_image_list', 'a list that misses a photo is refused');
reset role;

do $$ begin perform set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true); end $$;
set local role authenticated;
select throws_ok(
  $$ select public.admin_reorder_product_images('00000000-0000-0000-0000-000000000041',
       array['00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-0000000000c1',
             '00000000-0000-0000-0000-0000000000c2']::uuid[]) $$,
  '42501', null, 'customers cannot reorder product photos');
reset role;

select throws_ok(
  $$ insert into public.product_images (product_id, storage_path)
     select '00000000-0000-0000-0000-000000000041'::uuid, 'extra/' || n || '.webp' from generate_series(1, 8) n $$,
  'P0001', 'too_many_images', 'a product holds at most 10 photos');

select * from finish();
rollback;