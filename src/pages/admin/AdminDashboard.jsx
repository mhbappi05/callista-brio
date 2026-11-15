import { Link } from 'react-router-dom'
import { PageHeader } from '@/features/admin/ui.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { catalogCounts } from '@/services/adminCatalogService'
import { orderCounts } from '@/services/adminOrderService'

function Card({ to, label, value, alert }) {
    return (
        <Link to={to} className={`block border p-4 hover:bg-blush ${alert && value > 0 ? 'border-maroon' : 'border-maroon/20'}`}>
            <p className="font-display text-4xl text-maroon">{value ?? '…'}</p>
            <p className="text-sm">{label}</p>
        </Link>
    )
}

export default function AdminDashboard() {
    useDocumentTitle('Admin')
    const { profile } = useAuth()
    const role = profile?.role
    const canOrders = ['owner', 'order_manager'].includes(role)
    const canCatalog = ['owner', 'catalog_manager'].includes(role)

    const orders = useAsync(() => (canOrders ? orderCounts() : Promise.resolve(null)), [canOrders])
    const catalog = useAsync(() => (canCatalog ? catalogCounts() : Promise.resolve(null)), [canCatalog])

    return (
        <section>
            <PageHeader title="Dashboard" />

            {canOrders && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card to="/admin/orders" label="New orders to confirm" value={orders.data?.pending} alert />
                    <Card to="/admin/orders" label="In progress (confirmed to packed)" value={orders.data?.inProgress} />
                    <Card to="/admin/orders" label="Shipped, not yet delivered" value={orders.data?.shipped} />
                    <Card to="/admin/messages" label="New messages" value={orders.data?.newMessages} alert />
                    <Card to="/admin/payments" label="Payments to review" value={orders.data?.paymentsToReview} alert />
                    <Card to="/admin/returns" label="Return requests awaiting a reply" value={orders.data?.returnsOpen} alert />
                </div>
            )}

            {canCatalog && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Card to="/admin/reviews" label="Reviews awaiting moderation" value={catalog.data?.pendingReviews} alert />
                    <Card to="/admin/products" label="Items at or below low-stock level" value={catalog.data?.lowStock.length} alert />
                </div>
            )}

            {catalog.data?.lowStock.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-2xl text-maroon">Low stock</h2>
                    <ul className="mt-3 divide-y divide-maroon/15 float-card">
                        {catalog.data.lowStock.slice(0, 15).map((p, i) => (
                            <li key={`${p.id}-${i}`} className="flex justify-between p-3 text-sm">
                                <Link to={`/admin/products/${p.id}`} className="underline">{p.name}</Link>
                                <span className={p.stock === 0 ? 'font-semibold text-maroon' : ''}>{p.stock === 0 ? 'Out of stock' : `${p.stock} left`}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </section>
    )
}