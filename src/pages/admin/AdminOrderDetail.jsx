import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, ErrorLine, inputClass, paymentTone, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getOrder, setOrderStatus, updateTracking } from '@/services/adminOrderService'
import { formatBDT } from '@/utils/currency'
import {
    NEXT_STATUSES, ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatDhakaDate,
} from '@/utils/orderLabels'

export default function AdminOrderDetail() {
    const { id } = useParams()
    const { data: order, error, loading, reload } = useAsync(() => getOrder(id), [id])
    useDocumentTitle(order ? `Order ${order.order_number}` : 'Order')

    if (error) return <ErrorState error={error} onRetry={reload} />
    if (loading && !order) return <p aria-busy="true">Loading…</p>
    if (!order) return <EmptyState title="Order not found" action={<Link to="/admin/orders" className="btn-primary">Back to orders</Link>} />
    return <OrderView key={order.updated_at} order={order} reload={reload} />
}

function OrderView({ order, reload }) {
    const status = useAction()
    const tracking = useAction()
    const [note, setNote] = useState('')
    const [track, setTrack] = useState({
        courier: order.courier_name ?? '', number: order.tracking_number ?? '', url: order.tracking_url ?? '',
    })
    const [saved, setSaved] = useState(false)

    const next = NEXT_STATUSES[order.order_status] ?? []
    const addr = order.shipping_address
    const history = [...order.order_status_history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))

    async function change(to) {
        if (to === 'cancelled') {
            const paidNote = ['paid', 'partially_refunded'].includes(order.payment_status)
                ? '\n\nThis order is already paid. Cancelling does not refund it. Request a refund in Payments afterwards.'
                : ''
            if (!window.confirm(`Cancel this order? The items go back into stock.${paidNote}`)) return
        }
        const r = await status.run(() => setOrderStatus(order.id, to, note.trim()))
        if (r.ok) reload()
    }

    async function saveTracking(e) {
        e.preventDefault()
        setSaved(false)
        const r = await tracking.run(() =>
            updateTracking(order.id, { courier: track.courier.trim(), number: track.number.trim(), url: track.url.trim() })
        )
        if (r.ok) setSaved(true)
    }

    return (
        <section>
            <p className="text-sm"><Link to="/admin/orders" className="underline">← All orders</Link></p>
            <h1 className="mt-2 text-4xl text-maroon">{order.order_number}</h1>
            <p className="mt-1 text-sm">Placed {formatDhakaDate(order.placed_at)}</p>

            <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div className="space-y-6">
                    <div className="border border-maroon/20 p-4">
                        <p className="flex items-center gap-2">
                            Status: <Badge tone={order.order_status === 'cancelled' ? 'bad' : 'default'}>{ORDER_STATUS_LABELS[order.order_status]}</Badge>
                        </p>
                        {next.length > 0 ? (
                            <div className="mt-3 space-y-3">
                                <label className="block text-sm">Note (optional, saved in the history)
                                    <input className={inputClass} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} />
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {next.filter((s) => s !== 'cancelled').map((s) => (
                                        <button key={s} type="button" className={`btn-primary ${smallBtn}`} disabled={status.busy} onClick={() => change(s)}>
                                            Mark {ORDER_STATUS_LABELS[s].toLowerCase()}
                                        </button>
                                    ))}
                                    {next.includes('cancelled') && (
                                        <button type="button" className={`btn-secondary ${smallBtn}`} disabled={status.busy} onClick={() => change('cancelled')}>
                                            Cancel order
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="mt-2 text-sm">This order is {ORDER_STATUS_LABELS[order.order_status].toLowerCase()} and can’t change status.</p>
                        )}
                        <ErrorLine message={status.error} />
                    </div>

                    <div className="border border-maroon/20 p-4 text-sm">
                        <h2 className="font-display text-2xl text-maroon">Customer</h2>
                        <p className="mt-2">{order.customer_name}</p>
                        <p>{order.customer_phone}</p>
                        {order.customer_email && <p>{order.customer_email}</p>}
                        <p className="mt-2 font-medium">Deliver to</p>
                        <p>{addr.recipient_name} · {addr.phone}</p>
                        <p>{addr.address_line}, {addr.city_or_area}, {addr.district}{addr.postal_code ? ` ${addr.postal_code}` : ''}</p>
                        {addr.delivery_instructions && <p className="opacity-70">Instructions: {addr.delivery_instructions}</p>}
                        {order.customer_note && <p className="mt-2">Customer note: {order.customer_note}</p>}
                        {!order.user_id && <p className="mt-2 opacity-70">Guest order</p>}
                    </div>

                    <form onSubmit={saveTracking} className="space-y-3 border border-maroon/20 p-4 text-sm">
                        <h2 className="font-display text-2xl text-maroon">Courier tracking</h2>
                        <label className="block">Courier
                            <input className={inputClass} value={track.courier} maxLength={80} onChange={(e) => setTrack({ ...track, courier: e.target.value })} />
                        </label>
                        <label className="block">Tracking number
                            <input className={inputClass} value={track.number} maxLength={80} onChange={(e) => setTrack({ ...track, number: e.target.value })} />
                        </label>
                        <label className="block">Tracking link (optional)
                            <input className={inputClass} value={track.url} placeholder="https://" onChange={(e) => setTrack({ ...track, url: e.target.value })} />
                        </label>
                        <ErrorLine message={tracking.error} />
                        {saved && <p role="status">Saved. Customers can now see this when they track the order.</p>}
                        <button type="submit" className={`btn-secondary ${smallBtn}`} disabled={tracking.busy}>Save tracking</button>
                    </form>
                </div>

                <div className="space-y-6">
                    <div className="border border-maroon/20 p-4 text-sm">
                        <h2 className="font-display text-2xl text-maroon">Items</h2>
                        <ul className="mt-2 divide-y divide-maroon/15">
                            {order.order_items.map((it) => (
                                <li key={it.id} className="flex justify-between gap-3 py-2">
                                    <span>{it.product_name}{it.variant_description ? ` (${it.variant_description})` : ''}{it.sku ? ` · ${it.sku}` : ''} × {it.quantity}</span>
                                    <span>{formatBDT(it.line_total)}</span>
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

                    <div className="border border-maroon/20 p-4 text-sm">
                        <h2 className="font-display text-2xl text-maroon">Payment</h2>
                        <p className="mt-2">
                            {PAYMENT_METHOD_LABELS[order.payment_method]} · <Badge tone={paymentTone(order.payment_status)}>{PAYMENT_STATUS_LABELS[order.payment_status]}</Badge>
                        </p>
                        {order.payments.map((p) => (
                            <p key={p.id} className="mt-1 opacity-80">
                                {formatBDT(p.amount)} · {PAYMENT_STATUS_LABELS[p.status]}{p.manual_transaction_id ? ` · Trx ${p.manual_transaction_id}` : ''}
                            </p>
                        ))}
                        <Link to="/admin/payments" className="mt-2 inline-block underline">Verify, flag or refund in Payments</Link>
                    </div>

                    <div className="border border-maroon/20 p-4 text-sm">
                        <h2 className="font-display text-2xl text-maroon">History</h2>
                        <ol className="mt-2 space-y-1">
                            {history.map((h) => (
                                <li key={h.id}>
                                    {ORDER_STATUS_LABELS[h.to_status] ?? h.to_status}
                                    <span className="opacity-70"> · {formatDhakaDate(h.created_at)}{h.note ? ` · ${h.note}` : ''}</span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </div>
        </section>
    )
}