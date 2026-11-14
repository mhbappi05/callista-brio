import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listReturns, updateReturn } from '@/services/adminOrderService'
import { RETURN_STATUS_LABELS, formatDhakaDate } from '@/utils/orderLabels'

const TABS = ['requested', 'approved', 'received', 'completed', 'rejected']
const ACTIONS = {
    requested: [['approved', 'Approve'], ['rejected', 'Decline']],
    approved: [['received', 'Mark item received'], ['rejected', 'Decline']],
    received: [['completed', 'Mark completed']],
}

export default function AdminReturns() {
    useDocumentTitle('Returns (admin)')
    const [tab, setTab] = useState('requested')
    const { data, error, loading, reload } = useAsync(() => listReturns(tab), [tab])
    const [open, setOpen] = useState(null) // { id, to }
    const [note, setNote] = useState('')
    const action = useAction()

    async function confirm(r) {
        const res = await action.run(() => updateReturn(r.id, open.to, note.trim()))
        if (res.ok) {
            setOpen(null)
            setNote('')
            reload()
        }
    }

    return (
        <section>
            <PageHeader title="Returns and exchanges" />
            <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Request status">
                {TABS.map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t}
                        onClick={() => { setTab(t); setOpen(null) }}
                        className={`px-4 py-2 text-sm ${tab === t ? 'bg-maroon text-ink-light' : 'border border-maroon/40'}`}>
                        {RETURN_STATUS_LABELS[t]}
                    </button>
                ))}
            </div>

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">Nothing here.</p>
                        : (
                            <ul className="mt-4 divide-y divide-maroon/15 border border-maroon/20">
                                {data.map((r) => {
                                    const byId = new Map((r.order?.order_items ?? []).map((i) => [i.id, i]))
                                    return (
                                        <li key={r.id} className="space-y-2 p-4 text-sm">
                                            <p className="font-medium">
                                                <Link className="underline" to={`/admin/orders/${r.order_id}`}>{r.order?.order_number}</Link>
                                                {' '}<Badge tone={r.request_type === 'exchange' ? 'warn' : 'default'}>{r.request_type === 'exchange' ? 'Exchange' : 'Return'}</Badge>
                                                {' '}· {formatDhakaDate(r.created_at)}
                                            </p>
                                            <p>{r.order?.customer_name} · {r.order?.customer_phone}</p>
                                            <ul className="list-disc pl-5">
                                                {r.items.map((it) => {
                                                    const oi = byId.get(it.order_item_id)
                                                    return <li key={it.order_item_id}>{oi ? `${oi.product_name}${oi.variant_description ? ` (${oi.variant_description})` : ''}` : 'Item'} × {it.quantity}</li>
                                                })}
                                            </ul>
                                            <p>Reason: {r.reason}</p>
                                            {r.response_note && <p className="opacity-70">Reply sent: {r.response_note}</p>}

                                            {r.status === 'received' && (
                                                <p className="bg-blush/50 p-2 text-xs">
                                                    Next steps, if approved: restock sellable items in Products → Stock (reason “Return restocked”), and refund in <Link className="underline" to="/admin/payments">Payments</Link>.
                                                </p>
                                            )}

                                            {ACTIONS[r.status] && (
                                                <div className="flex flex-wrap gap-2 pt-1">
                                                    {ACTIONS[r.status].map(([to, label]) => (
                                                        <button key={to} type="button" className={`${to === 'rejected' ? 'btn-secondary' : 'btn-primary'} ${smallBtn}`}
                                                            onClick={() => { setOpen({ id: r.id, to }); setNote('') }}>{label}</button>
                                                    ))}
                                                </div>
                                            )}

                                            {open?.id === r.id && (
                                                <div className="space-y-2 bg-blush/50 p-3">
                                                    <label className="block">Message to the customer (optional, they will see it)
                                                        <textarea rows={2} maxLength={500} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
                                                    </label>
                                                    <ErrorLine message={action.error} />
                                                    <div className="flex gap-2">
                                                        <button type="button" className={`btn-primary ${smallBtn}`} disabled={action.busy} onClick={() => confirm(r)}>
                                                            {action.busy ? 'Saving…' : 'Confirm'}
                                                        </button>
                                                        <button type="button" className={`btn-secondary ${smallBtn}`} onClick={() => setOpen(null)}>Cancel</button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
        </section>
    )
}