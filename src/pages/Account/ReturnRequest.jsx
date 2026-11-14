import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { accountErrorMessage, getMyOrder, requestReturn } from '@/services/accountService'
import { getPublicSetting } from '@/services/catalogService'
import { formatDhakaDate } from '@/utils/orderLabels'
import { OPEN_RETURN, buildReturnItems, returnDeadline, returnWindowOpen } from '@/utils/returns'

const input = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2 text-sm'

export default function ReturnRequest() {
    useDocumentTitle('Request a return')
    const { id } = useParams()
    const { user } = useAuth()
    const order = useAsync(() => getMyOrder(user.id, id), [user.id, id])
    const policy = useAsync(() => getPublicSetting('return_policy'), [])

    if (order.error || policy.error) return <ErrorState error={order.error || policy.error} onRetry={() => { order.reload(); policy.reload() }} />
    if ((order.loading && !order.data) || (policy.loading && !policy.data && !policy.error)) return <p aria-busy="true">Loading…</p>
    if (!order.data) return <EmptyState title="Order not found" action={<Link to="/account/orders" className="btn-primary">My orders</Link>} />

    const o = order.data
    const back = <Link to={`/account/orders/${o.id}`} className="btn-primary">Back to the order</Link>
    if (o.order_status !== 'delivered') {
        return <EmptyState title="Not available yet" message="You can request a return once the order has been delivered." action={back} />
    }
    if (o.returns.some((r) => OPEN_RETURN.includes(r.status))) {
        return <EmptyState title="Request already open" message="You already have an open request for this order." action={back} />
    }
    if (!returnWindowOpen(o.delivered_at, policy.data)) {
        return <EmptyState title="Return window closed" message="Please contact us if you need help with this order."
            action={<Link to="/contact" className="btn-primary">Contact us</Link>} />
    }
    return <ReturnForm order={o} policy={policy.data} />
}

function ReturnForm({ order, policy }) {
    const navigate = useNavigate()
    const [type, setType] = useState('return')
    const [selection, setSelection] = useState({})
    const [reason, setReason] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const deadline = returnDeadline(order.delivered_at, policy)

    function toggleItem(item, checked) {
        setSelection((s) => {
            const next = { ...s }
            if (checked) next[item.id] = 1
            else delete next[item.id]
            return next
        })
    }

    async function submit(e) {
        e.preventDefault()
        const items = buildReturnItems(selection)
        if (!items.length) return setError('Choose at least one item.')
        if (!reason.trim()) return setError('Please tell us why.')

        setBusy(true)
        setError('')
        try {
            await requestReturn(order.id, { type, reason: reason.trim(), items })
            navigate(`/account/orders/${order.id}`, { replace: true, state: { flash: 'Your request was sent. We’ll reply here and in your notifications.' } })
        } catch (err) {
            console.error(err)
            setError(accountErrorMessage(err))
            setBusy(false)
        }
    }

    return (
        <section className="max-w-2xl">
            <p className="text-sm"><Link to={`/account/orders/${order.id}`} className="underline">← {order.order_number}</Link></p>
            <h2 className="mt-2 text-3xl text-maroon">Request a return or exchange</h2>
            {deadline && <p className="mt-1 text-sm">Available until {formatDhakaDate(deadline)}.</p>}

            <form onSubmit={submit} noValidate className="mt-6 space-y-6">
                <fieldset>
                    <legend className="text-sm font-medium">What would you like?</legend>
                    <div className="mt-2 flex gap-6 text-sm">
                        {[['return', 'Return'], ['exchange', 'Exchange']].map(([k, label]) => (
                            <label key={k} className="flex items-center gap-2">
                                <input type="radio" name="type" value={k} checked={type === k} onChange={() => setType(k)} /> {label}
                            </label>
                        ))}
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-sm font-medium">Which items?</legend>
                    <ul className="mt-2 divide-y divide-maroon/15 border border-maroon/20">
                        {order.order_items.filter((i) => i.product_id).map((item) => {
                            const selected = item.id in selection
                            return (
                                <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
                                    <label className="flex items-center gap-3">
                                        <input type="checkbox" checked={selected} onChange={(e) => toggleItem(item, e.target.checked)} />
                                        <span>{item.product_name}{item.variant_description ? ` (${item.variant_description})` : ''}</span>
                                    </label>
                                    {selected && item.quantity > 1 && (
                                        <label className="flex items-center gap-2">Quantity
                                            <select className="border border-maroon/30 bg-cream px-2 py-1" value={selection[item.id]}
                                                onChange={(e) => setSelection({ ...selection, [item.id]: Number(e.target.value) })}>
                                                {Array.from({ length: item.quantity }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                                            </select>
                                        </label>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </fieldset>

                <div>
                    <label htmlFor="rr-reason" className="text-sm font-medium">Why are you returning this?</label>
                    <textarea id="rr-reason" rows={4} maxLength={1000} className={input} value={reason} onChange={(e) => setReason(e.target.value)} />
                </div>

                <p className="text-xs opacity-80">
                    Sending this request doesn’t guarantee approval. We’ll review it and tell you the next steps. Refunds, if approved, are handled separately.
                </p>
                {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Send request'}</button>
            </form>
        </section>
    )
}