import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, PageHeader, inputClass, paymentTone } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { ORDERS_PAGE, listOrders } from '@/services/adminOrderService'
import { formatBDT } from '@/utils/currency'
import {
    ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatDhakaDate,
} from '@/utils/orderLabels'

export default function AdminOrders() {
    useDocumentTitle('Orders (admin)')
    const [status, setStatus] = useState('')
    const [payment, setPayment] = useState('')
    const [term, setTerm] = useState('')
    const [q, setQ] = useState('')
    const [page, setPage] = useState(1)

    const { data, error, loading, reload } = useAsync(
        () => listOrders({ status, payment, q, page }),
        [status, payment, q, page]
    )
    const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / ORDERS_PAGE))

    const onFilter = (setter) => (e) => {
        setter(e.target.value)
        setPage(1)
    }

    return (
        <section>
            <PageHeader title="Orders" />

            <div className="mt-6 flex flex-wrap items-end gap-3">
                <form className="flex items-end gap-2" role="search"
                    onSubmit={(e) => { e.preventDefault(); setQ(term); setPage(1) }}>
                    <label className="text-sm">Search
                        <input className={`${inputClass} w-56`} placeholder="Order no., name or phone" value={term}
                            onChange={(e) => setTerm(e.target.value)} />
                    </label>
                    <button type="submit" className="btn-secondary !px-4 !py-2 text-sm">Search</button>
                </form>
                <label className="text-sm">Order status
                    <select className={inputClass} value={status} onChange={onFilter(setStatus)}>
                        <option value="">All</option>
                        {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </label>
                <label className="text-sm">Payment
                    <select className={inputClass} value={payment} onChange={onFilter(setPayment)}>
                        <option value="">All</option>
                        {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                </label>
            </div>

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
                    : !data?.items.length ? <p className="mt-6">No orders match these filters.</p>
                        : (
                            <>
                                <div className="mt-6 overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-maroon/30">
                                                <th className="py-2 pr-3">Order</th><th className="pr-3">Customer</th><th className="pr-3">Status</th>
                                                <th className="pr-3">Payment</th><th className="pr-3 text-right">Total</th><th>Placed</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.items.map((o) => (
                                                <tr key={o.id} className="border-b border-maroon/10">
                                                    <td className="py-2 pr-3"><Link className="underline" to={`/admin/orders/${o.id}`}>{o.order_number}</Link></td>
                                                    <td className="pr-3">{o.customer_name}<br /><span className="opacity-70">{o.customer_phone}</span></td>
                                                    <td className="pr-3"><Badge tone={o.order_status === 'cancelled' ? 'bad' : 'default'}>{ORDER_STATUS_LABELS[o.order_status]}</Badge></td>
                                                    <td className="pr-3">
                                                        <Badge tone={paymentTone(o.payment_status)}>{PAYMENT_STATUS_LABELS[o.payment_status]}</Badge>
                                                        <br /><span className="opacity-70">{PAYMENT_METHOD_LABELS[o.payment_method]}</span>
                                                    </td>
                                                    <td className="pr-3 text-right">{formatBDT(o.total_amount)}</td>
                                                    <td>{formatDhakaDate(o.placed_at)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {totalPages > 1 && (
                                    <nav aria-label="Pagination" className="mt-6 flex items-center gap-4">
                                        <button type="button" className="btn-secondary !px-4 !py-2 text-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                                        <span className="text-sm">Page {page} of {totalPages} ({data.total} orders)</span>
                                        <button type="button" className="btn-secondary !px-4 !py-2 text-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
                                    </nav>
                                )}
                            </>
                        )}
        </section>
    )
}