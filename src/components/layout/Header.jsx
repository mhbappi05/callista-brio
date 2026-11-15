import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Search, Heart, ShoppingBag, User, LogOut, Bell, Menu, X } from 'lucide-react'
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
const iconBtn = 'p-2.5 hover:text-gold transition-colors'
const badge = 'absolute right-0 top-0 min-w-5 rounded-full bg-gold px-1 text-center text-xs font-semibold text-ink'

export default function Header() {
  const { user, profile, signOut } = useAuth()
  const { count, openCart } = useCart()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const unread = useAsync(() => (user ? countUnread(user.id) : Promise.resolve(0)), [user?.id, pathname])

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
    `block pb-1 border-b ${isActive ? 'border-gold' : 'border-transparent hover:border-ink-light/50'}`

  return (
    <header className="bg-maroon text-ink-light">
      <div className="container-page flex items-center justify-between gap-2 py-3">
        <div className="flex items-center gap-1">
          <button type="button" className={`${iconBtn} md:hidden`} aria-expanded={menuOpen} aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen((o) => !o)}>
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
          {STAFF.includes(profile?.role) && (
            <Link to="/admin" className="px-2 text-sm hover:text-gold">Admin</Link>
          )}
          <Link to="/shop" className={iconBtn} aria-label="Search"><Search size={20} /></Link>
          <Link to="/wishlist" className={`${iconBtn} hidden sm:block`} aria-label="Wishlist"><Heart size={20} /></Link>
          {user && (
            <Link to="/account/notifications" className={`${iconBtn} relative`}
              aria-label={`Notifications${unread.data ? `, ${unread.data} unread` : ''}`}>
              <Bell size={20} />
              {unread.data > 0 && <span aria-hidden="true" className={badge}>{unread.data}</span>}
            </Link>
          )}
          <button type="button" onClick={openCart} className={`${iconBtn} relative`}
            aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}>
            <ShoppingBag size={20} />
            {count > 0 && <span aria-hidden="true" className={badge}>{count}</span>}
          </button>
          <Link to={user ? '/account/orders' : '/auth'} className={iconBtn} aria-label={user ? 'My account' : 'Sign in'}>
            <User size={20} />
          </Link>
          {user && (
            <button type="button" className={`${iconBtn} hidden sm:block`} aria-label="Sign out" onClick={() => signOut()}>
              <LogOut size={20} />
            </button>
          )}
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-ink-light/20 md:hidden">
          <ul className="container-page py-3 text-base">
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