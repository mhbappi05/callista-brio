# Callista Brio backend (Supabase)

Rename this file to `supabase/README.md`.

## Run locally (needs Docker Desktop)
```bash
npx supabase start       # local stack
npx supabase db reset    # applies every migration + seed.sql from scratch
npx supabase test db     # runs supabase/tests (pgTAP)
```
`db reset` plus `test db` proves the repo can rebuild the whole database. Run them after any SQL change.

## Migrations (applied in order)
| File | Contents |
|------|----------|
| 000001 helpers | `updated_at` trigger, Bangladesh phone normalizer |
| 000002 profiles/addresses/audit | profiles and roles, role helpers, addresses, `admin_logs`, audit trigger |
| 000003 catalog | categories, collections, products, images, variants, RLS |
| 000004 cart/wishlist | carts, cart items, wishlists |
| 000005 orders/payments/inventory | zones, coupons, orders, items, history, payments, refunds, returns, inventory logs, status rules |
| 000006 reviews/notifications/settings | reviews (verified purchase), notifications, store settings |
| 000007 storage | product and collection image buckets, upload policies |
| 000008 functions | `create_order`, `admin_*` functions |
| 000009 grants | table privilege allowlist |
| 000010 order quote + rate limit | `quote_order`, `check_rate_limit`, `rate_limit_hits`, payment instructions setting |
| 000011 payments | `payment_events`, `apply_gateway_result`, flag and refund functions |
| 000012 returns | return request columns, `return_policy` setting, `request_return`, `admin_update_return` |
| 000013 home banners | `home_banners` table and `home-banners` bucket |
| 000014 contact messages | `contact_messages` (written only by the Edge Function) |
| 000015 photos | product photo reorder + limit, `review_images`, `review-images` bucket |

## Applying to a Supabase project
- **New or production project (empty database):** `npx supabase db push --project-ref YOUR_REF`
  (or paste the files into the SQL Editor, one at a time, in order).
- **A project where you already ran this SQL by hand (your current test project):**
  do NOT `db push`. It would fail, because the objects exist. Either leave that project alone,
  or tell Supabase the files are already applied:
  `npx supabase migration repair --status applied 20261113000001 ... 20261113000015 --project-ref YOUR_REF`
  (list all 15 version numbers).

## After the migrations (first-run steps)
1. Sign up, then make yourself the owner: `update public.profiles set role = 'owner' where email = 'you@example.com';`
2. Admin > Settings: enable payment methods and add their instructions, return window, contact details, policy pages.
3. Admin > Delivery zones: add your real fees and districts (checkout fails with `delivery_unavailable` until you do).
4. Deploy the Edge Functions: create-order, quote-order, track-order, contact-message, payment-webhook.

## Key rules enforced in the database
- Clients can read their own orders but have no write path to orders, order items, payments, refunds or inventory.
- Totals, discounts, delivery fee and stock are computed and checked inside `create_order`, in one transaction with row locks.
- Order status transitions are validated; order totals and the address snapshot are immutable.
- Roles: customer, owner, order_manager, catalog_manager. Only the owner can change roles.
- Reviews need a delivered order item; review photos and photo changes go back to moderation.
- Admin-sensitive changes are written to `admin_logs`.

## Error codes (SQLSTATE P0001, message = code, DETAIL = JSON)
payment_method_unavailable, invalid_name, invalid_phone, invalid_email, invalid_address, invalid_items,
product_unavailable, variant_unavailable, insufficient_stock, delivery_unavailable, invalid_coupon,
coupon_min_order_not_met, coupon_exhausted, coupon_already_used, invalid_status_transition,
order_snapshot_immutable, returns_unavailable, return_window_closed, return_already_open,
invalid_image_list, too_many_images, too_many_review_images.
