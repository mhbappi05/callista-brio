import { NavLink, Outlet } from 'react-router-dom'
import { CATALOG_ROLES, ORDER_ROLES, OWNER, STAFF } from './roles.js'
import { useAuth } from '@/context/AuthContext'

const NAV = [
    { to: '/admin', label: 'Dashboard', end: true, roles: STAFF },
    { to: '/admin/orders', label: 'Orders', roles: ORDER_ROLES },
    { to: '/admin/payments', label: 'Payments', roles: ORDER_ROLES },
    { to: '/admin/returns', label: 'Returns', roles: ORDER_ROLES },
    { to: '/admin/customers', label: 'Customers', roles: ORDER_ROLES },
    { to: '/admin/products', label: 'Products', roles: CATALOG_ROLES },
    { to: '/admin/categories', label: 'Categories', roles: CATALOG_ROLES },
    { to: '/admin/collections', label: 'Collections', roles: CATALOG_ROLES },
    { to: '/admin/reviews', label: 'Reviews', roles: CATALOG_ROLES },
    { to: '/admin/coupons', label: 'Coupons', roles: OWNER },
    { to: '/admin/delivery', label: 'Delivery zones', roles: OWNER },
    { to: '/admin/settings', label: 'Settings', roles: OWNER },
]

export default function AdminLayout() {
    const { profile } = useAuth()
    const items = NAV.filter((n) => n.roles.includes(profile?.role))

    return (
        <div className="container-page grid gap-8 py-8 md:grid-cols-[13rem_1fr]">
            <nav aria-label="Admin" className="md:sticky md:top-4 md:self-start">
                <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
                    {items.map((n) => (
                        <li key={n.to}>
                            <NavLink
                                to={n.to}
                                end={n.end}
                                className={({ isActive }) =>
                                    `block px-3 py-2 text-sm ${isActive ? 'bg-maroon text-ink-light' : 'hover:bg-blush'}`
                                }
                            >
                                {n.label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="min-w-0"><Outlet /></div>
        </div>
    )
}