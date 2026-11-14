import { useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import CartLineItem from './CartLineItem.jsx'
import CartSummary from './CartSummary.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useCart } from '@/context/CartContext'

export default function CartDrawer() {
  const { open, closeCart, items, count, loading, error, reload } = useCart()
  const location = useLocation()
  const panelRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    closeCart()
  }, [location.pathname, closeCart])

  useEffect(() => {
    if (!open) return undefined
    const previous = document.activeElement
    closeRef.current?.focus()
    document.body.style.overflow = 'hidden'

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        closeCart()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previous?.focus?.()
    }
  }, [open, closeCart])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/50" onClick={closeCart} aria-hidden="true" />
      <div ref={panelRef} role="dialog" aria-modal="true" aria-label="Shopping cart"
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-cream shadow-xl">
        <div className="flex items-center justify-between border-b border-maroon/20 p-4">
          <h2 className="text-2xl text-maroon">Your cart ({count})</h2>
          <button ref={closeRef} type="button" onClick={closeCart} aria-label="Close cart" className="p-2">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4">
          {error ? (
            <ErrorState error={error} onRetry={reload} />
          ) : items.length === 0 && !loading ? (
            <div className="py-12 text-center">
              <p className="font-display text-2xl text-maroon">Your cart is empty</p>
              <Link to="/shop" className="btn-primary mt-6">Browse the shop</Link>
            </div>
          ) : (
            <ul>{items.map((item) => <CartLineItem key={item.key} item={item} compact />)}</ul>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-maroon/20 p-4">
            <CartSummary onNavigate={closeCart} />
            <Link to="/cart" className="mt-3 block text-center text-sm underline">View full cart</Link>
          </div>
        )}
      </div>
    </div>
  )
}