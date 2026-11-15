begin;

-- Test orders (cascades to items, payments, history, refunds, returns, coupon usage)
delete from public.orders;

-- Test coupons and demo catalog
update public.coupons set used_count = 0;
delete from public.coupons where code in ('SAVE10', 'FLAT100', 'WELCOME15');
delete from public.products
 where slug like 'sample-piece-%'
    or slug in ('hidden-archive-piece', 'sample-pearl-drop-earrings', 'sample-hand-painted-jhumka');

-- Housekeeping
delete from public.rate_limit_hits;
delete from public.payment_events;
delete from public.notifications;

-- Review what is left before committing
select 'orders' as what, count(*) from public.orders
union all select 'products', count(*) from public.products
union all select 'coupons', count(*) from public.coupons;

commit;  -- change to rollback; to preview without deleting