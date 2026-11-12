-- 9. Privilege allowlist (defense in depth on top of RLS)
--
-- Supabase grants broad table privileges to anon/authenticated by default and
-- relies on RLS alone. Here we strip everything and grant back only what the
-- app needs, so a missing or mistaken RLS policy cannot expose a write path.
-- If you add tables in later migrations, grant them explicitly the same way.

revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Public storefront reads (RLS limits rows to active/approved/public).
grant select on
  public.categories, public.collections, public.products, public.product_images,
  public.product_variants, public.delivery_zones, public.store_settings,
  public.reviews, public.product_review_stats
to anon, authenticated;

-- Signed-in customers
grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;   -- never role/email

grant select, insert, update, delete on
  public.addresses, public.carts, public.cart_items, public.wishlists
to authenticated;

grant insert, update, delete on public.reviews to authenticated;       -- RLS + review trigger

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;       -- mark read only

-- Read-only order data (writes only via functions / service role)
grant select on
  public.orders, public.order_items, public.order_status_history,
  public.refunds, public.return_requests, public.my_payments
to authenticated;

-- Staff screens. RLS decides who actually gets rows or may write.
grant select on
  public.payments, public.coupon_usages, public.inventory_logs, public.admin_logs
to authenticated;

grant insert, update, delete on
  public.categories, public.collections, public.products, public.product_images,
  public.product_variants, public.delivery_zones, public.store_settings
to authenticated;

grant select, insert, update, delete on public.coupons to authenticated;  -- owner-only via RLS
