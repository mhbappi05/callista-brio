import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listMyOrders } from '@/services/accountService'
import { formatBDT } from '@/utils/currency'
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, formatDhakaDate } from '@/utils/orderLabels'

export default function Orders() {
    useDocumentTitle('My orders')
    const { user } = useAuth()
    const { data, error, loading, reload } = useAsync(() => listMyOrders(user.id), [user.id])

    return (
        <section>
            <h2 className="text-3xl text-maroon">My orders</h2>
            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? (
                        <EmptyState title="No orders yet" message="When you place an order while signed in, it appears here."
                            action={<Link to="/shop" className="btn-primary">Browse the shop</Link>} />
                    ) : (
                        <ul className="mt-4 divide-y divide-maroon/15 float-card">
                            {data.map((o) => (
                                <li key={o.id}>
                                    <Link to={`/account/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-blush/40">
                                        <span>
                                            <span className="font-medium">{o.order_number}</span>
                                            <span className="block text-sm opacity-70">{formatDhakaDate(o.placed_at)}</span>
                                        </span>
                                        <span className="text-sm">
                                            {ORDER_STATUS_LABELS[o.order_status]} · {PAYMENT_STATUS_LABELS[o.payment_status]}
                                        </span>
                                        <span className="font-semibold text-maroon">{formatBDT(o.total_amount)}</span>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
            <p className="mt-4 text-sm">Placed an order as a guest? <Link to="/track" className="underline">Track it here</Link>.</p>
        </section>
    )
}