import { Link } from 'react-router-dom'
import FreeDeliveryProgress from './FreeDeliveryProgress.jsx'
import { useCart } from '@/context/CartContext'
import { formatBDT } from '@/utils/currency'

export default function CartSummary({ onNavigate }) {
  const { subtotal, loading, canCheckout, syncError } = useCart()

  return (
    <div>
      <p className="flex items-center justify-between text-lg">
        <span>Subtotal</span>
        <span className="font-semibold text-maroon">{loading ? '…' : formatBDT(subtotal)}</span>
      </p>
      <p className="mt-1 text-sm opacity-80">Delivery and any discounts are calculated at checkout.</p>
      <FreeDeliveryProgress subtotal={subtotal} />
      {syncError && (
        <p role="alert" className="mt-3 text-sm text-maroon">
          We couldn’t save your cart to your account. Your changes may not appear on other devices.
        </p>
      )}
      {canCheckout ? (
        <Link to="/checkout" onClick={onNavigate} className="btn-primary mt-4 w-full">Checkout</Link>
      ) : (
        <button type="button" disabled className="btn-primary mt-4 w-full opacity-50">Checkout</button>
      )}
    </div>
  )
}