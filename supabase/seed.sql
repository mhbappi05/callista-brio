-- DEVELOPMENT SEED ONLY (runs on `supabase db reset`). Never run against production.
-- Delivery fees below are PLACEHOLDERS so checkout can be exercised locally.
-- The real fees, coverage and free-delivery threshold are owner decisions
-- (doc section 18) and must be entered by the owner in production.

insert into public.categories (name, slug, display_order) values
  ('Jhumkas',          'jhumkas',          1),
  ('Studs',            'studs',            2),
  ('Hoops',            'hoops',            3),
  ('Pearl Drops',      'pearl-drops',      4),
  ('Hand-Painted',     'hand-painted',     5),
  ('Statement Pieces', 'statement-pieces', 6)
on conflict (slug) do nothing;

insert into public.collections (name, slug, display_order, is_featured) values
  ('First Drop',  'first-drop',  1, true),
  ('Flower Drop', 'flower-drop', 2, true),
  ('Moon Drop',   'moon-drop',   3, false),
  ('80s Retro',   '80s-retro',   4, false)
on conflict (slug) do nothing;

insert into public.delivery_zones (code, name, fee, districts, is_fallback, display_order) values
  ('inside_dhaka',  'Inside Dhaka (dev placeholder fee)',  70.00,  array['Dhaka'], false, 1),
  ('outside_dhaka', 'Outside Dhaka (dev placeholder fee)', 120.00, '{}',           true,  2)
on conflict (code) do nothing;

-- Enable COD locally only.
update public.store_settings
   set value = '{"cod": true, "bkash_manual": false, "nagad_manual": false, "gateway": false}'::jsonb
 where key = 'payment_methods';

insert into public.products (name, slug, description, material, price, stock_quantity, is_featured,
                             category_id, collection_id)
select 'Sample Pearl Drop Earrings', 'sample-pearl-drop-earrings',
       'Sample product for local development.', 'Freshwater pearl', 850.00, 12, true,
       (select id from public.categories  where slug = 'pearl-drops'),
       (select id from public.collections where slug = 'first-drop')
where not exists (select 1 from public.products where slug = 'sample-pearl-drop-earrings');

insert into public.products (name, slug, description, material, price, discount_price, stock_quantity,
                             category_id, collection_id)
select 'Sample Hand-Painted Jhumka', 'sample-hand-painted-jhumka',
       'Sample product for local development.', 'Brass, acrylic paint', 1200.00, 990.00, 5,
       (select id from public.categories  where slug = 'jhumkas'),
       (select id from public.collections where slug = 'flower-drop')
where not exists (select 1 from public.products where slug = 'sample-hand-painted-jhumka');
