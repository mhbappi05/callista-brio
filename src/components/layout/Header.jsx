import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Search, Heart, ShoppingBag, User, LogOut, Bell, Menu, X, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useAsync } from '@/hooks/useAsync'
import { countUnread } from '@/services/accountService'

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/shop', label: 'Shop' },
  { to: '/collections', label: 'Collections' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

const STAFF = ['owner', 'order_manager', 'catalog_manager']
const iconBtn = 'tip icon-btn relative p-2.5 hover:text-gold'
const badge = 'absolute right-0 top-0 min-w-5 rounded-full bg-gold px-1 text-center text-xs font-semibold text-ink badge-pop'

export default function Header() {
  const { user, profile, signOut } = useAuth()
  const { count, openCart } = useCart()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const unread = useAsync(() => (user ? countUnread(user.id) : Promise.resolve(0)), [user?.id, pathname])
  const isStaff = STAFF.includes(profile?.role)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  const navClass = ({ isActive }) =>
    `block border-b pb-1 transition-colors ${isActive ? 'border-gold' : 'border-transparent hover:border-ink-light/60'}`

  return (
    <header className="frame sticky top-2 z-40 mt-2 rounded-2xl bg-maroon text-ink-light shadow-float-lg">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:px-5">
        <div className="flex items-center gap-1">
          <button type="button" className={`${iconBtn} md:hidden`} data-tip={menuOpen ? 'Close menu' : 'Menu'}
            aria-expanded={menuOpen} aria-controls="mobile-nav" aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/" className="font-display text-2xl font-semibold tracking-wide">Callista Brio</Link>
        </div>

        <nav aria-label="Main" className="hidden md:block">
          <ul className="flex gap-8 text-sm">
            {links.map((l) => (
              <li key={l.to}><NavLink to={l.to} end={l.end} className={navClass}>{l.label}</NavLink></li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center">
          <Link to="/shop" className={iconBtn} data-tip="Search the shop" aria-label="Search">
            <Search size={20} />
          </Link>
          <Link to="/wishlist" className={`${iconBtn} hidden sm:block`} data-tip="Your wishlist" aria-label="Wishlist">
            <Heart size={20} />
          </Link>
          {user && (
            <Link to="/account/notifications" className={iconBtn} data-tip="Notifications"
              aria-label={`Notifications${unread.data ? `, ${unread.data} unread` : ''}`}>
              <Bell size={20} />
              {unread.data > 0 && <span key={unread.data} aria-hidden="true" className={badge}>{unread.data}</span>}
            </Link>
          )}
          <button type="button" onClick={openCart} className={iconBtn} data-cart-target data-tip="Your cart"
            aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <ShoppingBag size={20} />
            {count > 0 && <span key={count} aria-hidden="true" className={badge}>{count}</span>}
          </button>
          {isStaff ? (
            <Link to="/admin" className={`${iconBtn} tip-end`} data-tip="Admin dashboard" aria-label="Admin dashboard">
              <LayoutDashboard size={20} />
            </Link>
          ) : (
            <Link to={user ? '/account/orders' : '/auth'} className={`${iconBtn} ${user ? '' : 'tip-end'}`}
              data-tip={user ? 'My account' : 'Sign in'} aria-label={user ? 'My account' : 'Sign in'}>
              <User size={20} />
            </Link>
          )}
          {user && (
            <button type="button" className={`${iconBtn} tip-end hidden sm:block`} data-tip="Sign out"
              aria-label="Sign out" onClick={() => signOut()}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-ink-light/20 md:hidden">
          <ul className="px-5 py-3 text-base">
            {[...links, { to: '/wishlist', label: 'Wishlist' }].map((l) => (
              <li key={l.to} className="py-2"><NavLink to={l.to} end={l.end} className={navClass}>{l.label}</NavLink></li>
            ))}
            {user && (
              <li className="py-2">
                <button type="button" className="underline" onClick={() => signOut()}>Sign out</button>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  )
}