import { Link, useLocation, useParams } from 'react-router-dom'
import OrderTimeline from '@/features/account/OrderTimeline.jsx'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { productImageUrl } from '@/lib/storageUrls'
import { getMyOrder } from '@/services/accountService'
import { getPublicSetting } from '@/services/catalogService'
import { formatBDT } from '@/utils/currency'
import {
    ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, RETURN_STATUS_LABELS, formatDhakaDate,
} from '@/utils/orderLabels'
import { OPEN_RETURN, returnDeadline, returnWindowOpen } from '@/utils/returns'

export default function OrderDetail() {
    const { id } = useParams()
    const { user } = useAuth()
    const { data: order, error, loading, reload } = useAsync(() => getMyOrder(user.id, id), [user.id, id])
    useDocumentTitle(order ? `Order ${order.order_number}` : 'Order')

    if (error) return <ErrorState error={error} onRetry={reload} />
    if (loading && !order) return <p aria-busy="true">Loading…</p>
    if (!order) {
        return <EmptyState title="Order not found" message="That order isn’t in your account."
            action={<Link to="/account/orders" className="btn-primary">My orders</Link>} />
    }
    return <OrderView order={order} />
}

function OrderView({ order }) {
    const flash = useLocation().state?.flash
    const policy = useAsync(() => getPublicSetting('return_policy'), [])
    const addr = order.shipping_address
    const history = [...order.order_status_history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    const reviewed = new Map(order.reviews.map((r) => [r.order_item_id, r.status]))
    const safeTracking = /^https?:\/\//i.test(order.tracking_url ?? '') ? order.tracking_url : null

    const delivered = order.order_status === 'delivered'
    const openReturn = order.returns.find((r) => OPEN_RETURN.includes(r.status))
    const windowOpen = returnWindowOpen(order.delivered_at, policy.data)
    const deadline = returnDeadline(order.delivered_at, policy.data)

    return (
        <section>
            <p className="text-sm"><Link to="/account/orders" className="underline">← My orders</Link></p>
            <h2 className="mt-2 text-3xl text-maroon">{order.order_number}</h2>
            <p className="text-sm">Placed {formatDhakaDate(order.placed_at)}</p>
            {flash && <p role="status" className="mt-3 bg-blush p-3 text-sm">{flash}</p>}

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <div className="float-card p-4">
                        <h3 className="mb-3 font-display text-2xl text-maroon">Progress</h3>
                        <OrderTimeline status={order.order_status} history={history} />
                        {(order.courier_name || order.tracking_number) && (
                            <p className="mt-4 text-sm">
                                Courier: {order.courier_name ?? '—'}
                                {order.tracking_number && <> · Tracking no. {order.tracking_number}</>}
                                {safeTracking && <> · <a className="underline" href={safeTracking} target="_blank" rel="noopener noreferrer">Track with courier</a></>}
                            </p>
                        )}
                    </div>

                    <div className="float-card p-4 text-sm">
                        <h3 className="font-display text-2xl text-maroon">Delivery</h3>
                        <p className="mt-2">{addr.recipient_name} · {addr.phone}</p>
                        <p>{addr.address_line}, {addr.city_or_area}, {addr.district}{addr.postal_code ? ` ${addr.postal_code}` : ''}</p>
                        {addr.delivery_instructions && <p className="opacity-70">Instructions: {addr.delivery_instructions}</p>}
                    </div>

                    <div className="float-card p-4 text-sm">
                        <h3 className="font-display text-2xl text-maroon">Payment</h3>
                        <p className="mt-2">{PAYMENT_METHOD_LABELS[order.payment_method]} · {PAYMENT_STATUS_LABELS[order.payment_status]}</p>
                        {order.refunds.map((r) => (
                            <p key={r.id} className="opacity-80">Refund of {formatBDT(r.amount)}: {r.status}</p>
                        ))}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="float-card p-4 text-sm">
                        <h3 className="font-display text-2xl text-maroon">Items</h3>
                        <ul className="mt-2 divide-y divide-maroon/15">
                            {order.order_items.map((it) => (
                                <li key={it.id} className="flex gap-3 py-3">
                                    <img src={productImageUrl(it.product_image)} alt="" className="h-14 w-14 object-cover" />
                                    <div className="flex-1">
                                        <p>{it.product_name}</p>
                                        {it.variant_description && <p className="opacity-70">{it.variant_description}</p>}
                                        <p className="opacity-70">Qty {it.quantity}</p>
                                        {delivered && it.product_id && (
                                            reviewed.has(it.id)
                                                ? <p className="mt-1 text-xs">Review {reviewed.get(it.id) === 'approved' ? 'published' : 'submitted'}</p>
                                                : <Link to={`/account/reviews/new?item=${it.id}`} className="mt-1 inline-block text-xs underline">Write a review</Link>
                                        )}
                                    </div>
                                    <p>{formatBDT(it.line_total)}</p>
                                </li>
                            ))}
                        </ul>
                        <dl className="mt-3 space-y-1">
                            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBDT(order.subtotal)}</dd></div>
                            {Number(order.discount_total) > 0 && (
                                <div className="flex justify-between"><dt>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</dt><dd>−{formatBDT(order.discount_total)}</dd></div>
                            )}
                            <div className="flex justify-between"><dt>Delivery ({order.delivery_zone_name})</dt><dd>{formatBDT(order.delivery_fee)}</dd></div>
                            <div className="flex justify-between border-t border-maroon/20 pt-2 font-semibold text-maroon"><dt>Total</dt><dd>{formatBDT(order.total_amount)}</dd></div>
                        </dl>
                    </div>

                    <div className="float-card p-4 text-sm">
                        <h3 className="font-display text-2xl text-maroon">Returns and exchanges</h3>
                        {order.returns.map((r) => (
                            <div key={r.id} className="mt-2 bg-blush/40 p-3">
                                <p><strong>{r.request_type === 'exchange' ? 'Exchange' : 'Return'}: {RETURN_STATUS_LABELS[r.status]}</strong> · {formatDhakaDate(r.created_at)}</p>
                                {r.response_note && <p className="mt-1">Our reply: {r.response_note}</p>}
                            </div>
                        ))}
                        {!delivered ? (
                            <p className="mt-2">You can request a return once this order has been delivered.</p>
                        ) : openReturn ? (
                            <p className="mt-2">You have an open request for this order.</p>
                        ) : policy.loading && !policy.data ? (
                            <p className="mt-2">Checking…</p>
                        ) : windowOpen ? (
                            <>
                                <p className="mt-2">You can request a return or exchange until {formatDhakaDate(deadline)}.</p>
                                <Link to={`/account/orders/${order.id}/return`} className="btn-secondary mt-3 !px-4 !py-2">Request a return or exchange</Link>
                            </>
                        ) : policy.data?.enabled ? (
                            <p className="mt-2">The return window for this order has closed. <Link to="/contact" className="underline">Contact us</Link> if you need help.</p>
                        ) : (
                            <p className="mt-2">For returns or exchanges, please <Link to="/contact" className="underline">contact us</Link>.</p>
                        )}
                    </div>
                </div>
            </div>
        </section>
    )
}