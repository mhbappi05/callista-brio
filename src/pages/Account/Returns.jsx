import { Link } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listMyReturns } from '@/services/accountService'
import { RETURN_STATUS_LABELS, formatDhakaDate } from '@/utils/orderLabels'

export default function Returns() {
    useDocumentTitle('My returns')
    const { user } = useAuth()
    const { data, error, loading, reload } = useAsync(() => listMyReturns(user.id), [user.id])

    return (
        <section>
            <h2 className="text-3xl text-maroon">Returns and exchanges</h2>
            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? (
                        <EmptyState title="No requests" message="Requests you make from a delivered order appear here."
                            action={<Link to="/account/orders" className="btn-primary">My orders</Link>} />
                    ) : (
                        <ul className="mt-4 divide-y divide-maroon/15 float-card">
                            {data.map((r) => (
                                <li key={r.id} className="p-4 text-sm">
                                    <p className="font-medium">
                                        {r.request_type === 'exchange' ? 'Exchange' : 'Return'} · {RETURN_STATUS_LABELS[r.status]}
                                    </p>
                                    <p>
                                        <Link to={`/account/orders/${r.order_id}`} className="underline">{r.order?.order_number}</Link>
                                        {' '}· {formatDhakaDate(r.created_at)}
                                    </p>
                                    <p className="mt-1 opacity-80">Your reason: {r.reason}</p>
                                    {r.response_note && <p className="mt-1">Our reply: {r.response_note}</p>}
                                </li>
                            ))}
                        </ul>
                    )}
        </section>
    )
}