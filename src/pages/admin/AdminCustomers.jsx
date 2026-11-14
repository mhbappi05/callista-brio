import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listCustomerOrders, listCustomers } from '@/services/adminOrderService'
import { setUserRole } from '@/services/adminSettingsService'
import { formatBDT } from '@/utils/currency'
import { ORDER_STATUS_LABELS, formatDhakaDate } from '@/utils/orderLabels'

const ROLES = { customer: 'Customer', order_manager: 'Order manager', catalog_manager: 'Catalog manager', owner: 'Owner' }

function CustomerOrders({ userId }) {
    const { data, error } = useAsync(() => listCustomerOrders(userId), [userId])
    if (error) return <p className="text-maroon">Couldn’t load orders.</p>
    if (!data) return <p>Loading…</p>
    if (!data.length) return <p>No orders yet.</p>
    return (
        <ul className="mt-2 space-y-1">
            {data.map((o) => (
                <li key={o.id}>
                    <Link className="underline" to={`/admin/orders/${o.id}`}>{o.order_number}</Link>
                    {' '}· {ORDER_STATUS_LABELS[o.order_status]} · {formatBDT(o.total_amount)} · {formatDhakaDate(o.placed_at)}
                </li>
            ))}
        </ul>
    )
}

export default function AdminCustomers() {
    useDocumentTitle('Customers (admin)')
    const { profile } = useAuth()
    const isOwner = profile?.role === 'owner'
    const [term, setTerm] = useState('')
    const [q, setQ] = useState('')
    const [open, setOpen] = useState(null)
    const { data, error, loading, reload } = useAsync(() => listCustomers(q), [q])
    const action = useAction()

    async function changeRole(id, role) {
        if (!window.confirm(`Change this account’s role to “${ROLES[role]}”?`)) return
        const r = await action.run(() => setUserRole(id, role))
        if (r.ok) reload()
    }

    return (
        <section>
            <PageHeader title="Customers" />
            <form className="mt-6 flex items-end gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setQ(term) }}>
                <label className="text-sm">Search
                    <input className={`${inputClass} w-64`} placeholder="Name, email or phone" value={term} onChange={(e) => setTerm(e.target.value)} />
                </label>
                <button type="submit" className={`btn-secondary ${smallBtn}`}>Search</button>
            </form>
            <p className="mt-2 text-xs opacity-70">Customer contact details are for fulfilling orders only. Showing the 50 newest matches.</p>
            <div className="mt-2"><ErrorLine message={action.error} /></div>

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">No customers found.</p>
                        : (
                            <ul className="mt-4 divide-y divide-maroon/15 border border-maroon/20">
                                {data.map((c) => (
                                    <li key={c.id} className="p-4 text-sm">
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div>
                                                <p className="font-medium">{c.full_name || '(no name)'} {c.role !== 'customer' && <Badge tone="warn">{ROLES[c.role]}</Badge>}</p>
                                                <p>{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                                                <p className="opacity-70">Joined {formatDhakaDate(c.created_at)}</p>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {isOwner && (
                                                    <label className="text-xs">Role
                                                        <select className={`${inputClass} !mt-0 w-40`} value={c.role} disabled={action.busy}
                                                            onChange={(e) => changeRole(c.id, e.target.value)}>
                                                            {Object.entries(ROLES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                                                        </select>
                                                    </label>
                                                )}
                                                <button type="button" className="underline" aria-expanded={open === c.id}
                                                    onClick={() => setOpen(open === c.id ? null : c.id)}>
                                                    {open === c.id ? 'Hide orders' : 'Orders'}
                                                </button>
                                            </div>
                                        </div>
                                        {open === c.id && <div className="mt-3 bg-blush/40 p-3"><CustomerOrders userId={c.id} /></div>}
                                    </li>
                                ))}
                            </ul>
                        )}
        </section>
    )
}