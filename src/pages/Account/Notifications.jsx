import { Link } from 'react-router-dom'
import { ErrorLine, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listNotifications, markAllRead, markRead } from '@/services/accountService'
import { formatDhakaDate } from '@/utils/orderLabels'

export default function Notifications() {
    useDocumentTitle('Notifications')
    const { user } = useAuth()
    const { data, error, loading, reload } = useAsync(() => listNotifications(user.id), [user.id])
    const action = useAction()
    const unread = data?.filter((n) => !n.read_at).length ?? 0

    async function read(id) {
        const r = await action.run(() => markRead(user.id, id))
        if (r.ok) reload()
    }
    async function readAll() {
        const r = await action.run(() => markAllRead(user.id))
        if (r.ok) reload()
    }

    return (
        <section>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-3xl text-maroon">Notifications</h2>
                {unread > 0 && <button type="button" className="btn-secondary !px-4 !py-2 text-sm" disabled={action.busy} onClick={readAll}>Mark all as read</button>}
            </div>
            <ErrorLine message={action.error} />

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">No notifications yet.</p>
                        : (
                            <ul className="mt-4 divide-y divide-maroon/15 border border-maroon/20">
                                {data.map((n) => {
                                    const orderId = n.data?.order_id
                                    const link = n.type === 'return_requested' || n.type === 'return_update' || orderId ? `/account/orders/${orderId}` : null
                                    return (
                                        <li key={n.id} className={`flex flex-wrap items-start justify-between gap-3 p-4 text-sm ${n.read_at ? '' : 'bg-blush/40'}`}>
                                            <div>
                                                <p className={n.read_at ? '' : 'font-medium'}>
                                                    {!n.read_at && <span className="sr-only">Unread. </span>}{n.title}
                                                </p>
                                                <p className="opacity-70">{formatDhakaDate(n.created_at)}</p>
                                                {link && orderId && <Link to={link} className="underline">View order</Link>}
                                            </div>
                                            {!n.read_at && <button type="button" className="underline" disabled={action.busy} onClick={() => read(n.id)}>Mark as read</button>}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
        </section>
    )
}