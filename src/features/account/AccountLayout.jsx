import { NavLink, Outlet } from 'react-router-dom'

const NAV = [
    ['/account/orders', 'Orders'],
    ['/account/returns', 'Returns'],
    ['/wishlist', 'Wishlist'],
    ['/account/reviews', 'Reviews'],
    ['/account/addresses', 'Addresses'],
    ['/account/notifications', 'Notifications'],
    ['/account/profile', 'Profile'],
]

export default function AccountLayout() {
    return (
        <div className="container-page grid gap-8 py-10 md:grid-cols-[12rem_1fr]">
            <nav aria-label="My account" className="md:self-start">
                <h1 className="mb-3 font-display text-3xl text-maroon">My account</h1>
                <ul className="flex flex-wrap gap-2 md:flex-col md:gap-1">
                    {NAV.map(([to, label]) => (
                        <li key={to}>
                            <NavLink to={to}
                                className={({ isActive }) => `block px-3 py-2 text-sm ${isActive ? 'bg-maroon text-ink-light' : 'hover:bg-blush'}`}>
                                {label}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="min-w-0"><Outlet /></div>
        </div>
    )
}