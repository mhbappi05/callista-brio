import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CATALOG_ROLES, ORDER_ROLES, OWNER, STAFF } from './roles.js'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { countNewMessages } from '@/services/adminMessageService'

const NAV = [
    { to: '/admin', label: 'Dashboard', end: true, roles: STAFF },
    { to: '/admin/orders', label: 'Orders', roles: ORDER_ROLES },
    { to: '/admin/payments', label: 'Payments', roles: ORDER_ROLES },
    { to: '/admin/returns', label: 'Returns', roles: ORDER_ROLES },
    { to: '/admin/messages', label: 'Messages', roles: ORDER_ROLES, badge: true },
    { to: '/admin/customers', label: 'Customers', roles: ORDER_ROLES },
    { to: '/admin/products', label: 'Products', roles: CATALOG_ROLES },
    { to: '/admin/categories', label: 'Categories', roles: CATALOG_ROLES },
    { to: '/admin/collections', label: 'Collections', roles: CATALOG_ROLES },
    { to: '/admin/reviews', label: 'Reviews', roles: CATALOG_ROLES },
    { to: '/admin/banners', label: 'Home banners', roles: CATALOG_ROLES },
    { to: '/admin/coupons', label: 'Coupons', roles: OWNER },
    { to: '/admin/delivery', label: 'Delivery zones', roles: OWNER },
    { to: '/admin/settings', label: 'Settings', roles: OWNER },
    { to: '/admin/password', label: 'Password', roles: STAFF },
]

export default function AdminLayout() {
    const { profile } = useAuth()
    const { pathname } = useLocation()
    const items = NAV.filter((n) => n.roles.includes(profile?.role))
    const canMessages = ORDER_ROLES.includes(profile?.role)
    // Refreshes on every admin page change, so the count drops after you read a message.
    const unread = useAsync(() => (canMessages ? countNewMessages() : Promise.resolve(0)), [canMessages, pathname])

    return (
        <div className="container-page grid gap-8 py-8 md:grid-cols-[13rem_1fr]">
            <nav aria-label="Admin" className="md:sticky md:top-24 md:self-start">
                <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
                    {items.map((n) => (
                        <li key={n.to}>
                            <NavLink to={n.to} end={n.end}
                                className={({ isActive }) =>
                                    `flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm transition-colors ${isActive ? 'bg-maroon text-ink-light' : 'hover:bg-blush'}`
                                }>
                                {n.label}
                                {n.badge && unread.data > 0 && (
                                    <span className="rounded-full bg-gold px-2 text-xs font-semibold text-ink">
                                        {unread.data}<span className="sr-only"> new</span>
                                    </span>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="min-w-0"><Outlet /></div>
        </div>
    )
}