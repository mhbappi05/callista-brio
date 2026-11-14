import { Link, NavLink } from 'react-router-dom'
import { Search, Heart, ShoppingBag, User, LogOut } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const iconBtn = 'p-2 hover:text-gold transition-colors'

export default function Header() {
  const { user, signOut } = useAuth()
  const { count, openCart } = useCart()

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
          <button
            type="button"
            onClick={openCart}
            className={`${iconBtn} relative`}
            aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
          >
            <ShoppingBag size={20} />
            {count > 0 && (
              <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-gold px-1 text-center text-xs font-semibold text-ink">
                {count}
              </span>
            )}
          </button>
          <Link to={user ? '/account/addresses' : '/auth'} className={iconBtn} aria-label={user ? 'My account' : 'Sign in'}>
            <User size={20} />
          </Link>
          {user && (
            <button type="button" className={iconBtn} aria-label="Sign out" onClick={() => signOut()}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}