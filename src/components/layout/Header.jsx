import { Link, NavLink } from 'react-router-dom'
import { Search, Heart, ShoppingBag, User } from 'lucide-react'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const iconBtn = 'p-2 hover:text-gold transition-colors'

export default function Header() {
  return (
    <header className="bg-maroon text-ink-light">
      <div className="container-page flex items-center justify-between gap-4 py-4">
        <Link to="/" className="font-display text-2xl font-semibold tracking-wide">
          Callista Brio
        </Link>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-8 text-sm">
            {links.map((l) => (
              <li key={l.to}>
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) =>
                    `pb-1 border-b ${isActive ? 'border-gold' : 'border-transparent hover:border-ink-light/50'}`
                  }
                >
                  {l.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center">
          <Link to="/shop" className={iconBtn} aria-label="Search"><Search size={20} /></Link>
          <Link to="/wishlist" className={iconBtn} aria-label="Wishlist"><Heart size={20} /></Link>
          <Link to="/cart" className={iconBtn} aria-label="Cart"><ShoppingBag size={20} /></Link>
          <Link to="/auth" className={iconBtn} aria-label="Account"><User size={20} /></Link>
        </div>
      </div>
    </header>
  )
}
