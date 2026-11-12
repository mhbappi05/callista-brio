# Callista Brio backend (Supabase)

## Apply
```bash
supabase init          # once; creates config.toml (keeps existing files)
supabase start         # local stack
supabase db reset      # applies migrations + seed.sql
supabase test db       # runs supabase/tests (pgTAP)
```
Review every migration in a **staging** project before production (doc section 7).
These migrations have not been executed yet: run the tests first and fix anything they surface.

## Migrations (apply in order)
| File | Contents |
|------|----------|
| 000001 helpers | `updated_at` trigger, Bangladesh phone normalizer |
| 000002 profiles/addresses/audit | profiles + roles, role helpers, addresses, `admin_logs`, audit trigger |
| 000003 catalog | categories, collections, products, images, variants, RLS |
| 000004 cart/wishlist | carts, cart items, wishlists |
| 000005 orders/payments/inventory | zones, coupons, orders, items, history, payments, refunds, returns, inventory logs, status rules |
| 000006 reviews/notifications/settings | reviews (verified purchase), notifications, store settings |
| 000007 storage | buckets and upload policies |
| 000008 functions | `create_order`, `admin_*` functions |
| 000009 grants | table privilege allowlist |

## Key rules enforced in the database
- Clients can **read** their own orders but have **no write path** to orders, order items, payments, refunds, or inventory. Writes go through `create_order` (service role) and `admin_*` functions.
- Totals, discounts, delivery fee and stock are computed/checked inside `create_order`, in one transaction, with row locks (no overselling). Same `idempotency_key` returns the original order.
- Stock is deducted when an order is placed and restored automatically on cancellation.
- Order status transitions are validated; order totals and address snapshot are immutable.
- Order status and payment status are separate; `orders.payment_status` mirrors the latest payment row.
- Roles: `customer`, `owner`, `order_manager`, `catalog_manager`. Customers cannot change roles; only `admin_set_user_role` (owner) can.
- Reviews require a **delivered** order item for the same product and start in moderation.
- Admin-sensitive changes are written to `admin_logs`.

## Decisions I made (change if you disagree)
1. **Stock policy:** deduct at order placement (not at payment).
2. **Payment methods start disabled** in `store_settings`; the owner enables each after confirming conditions. `seed.sql` enables COD for local dev only.
3. **Delivery zones are not seeded in migrations.** Checkout fails with `delivery_unavailable` until the owner creates zones. `seed.sql` has dev placeholders only.
4. **Guest carts and guest order tracking** are not exposed through the public API. They need Edge Functions (service role) holding a hashed token / order number + phone.
5. Added a `return_requests` table (implied by doc 6.5 and `request-return`).

## Still to build (Edge Functions, later phases)
`create-order` (wraps `create_order`, verifies JWT, rate limits), `apply-coupon`, `cancel-order`, `request-return`, `track-order` (guest), `payment-webhook`, `create-payment`, `process-refund`, `send-order-notification`.

## Error codes (SQLSTATE `P0001`, message = code, `DETAIL` = JSON)
`payment_method_unavailable`, `invalid_name`, `invalid_phone`, `invalid_email`, `invalid_address`,
`invalid_items`, `product_unavailable`, `variant_unavailable`, `insufficient_stock`,
`delivery_unavailable`, `invalid_coupon`, `coupon_min_order_not_met`, `coupon_exhausted`,
`coupon_already_used`, `invalid_status_transition`, `order_snapshot_immutable`.
