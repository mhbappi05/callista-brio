import { Link, useLocation } from 'react-router-dom'
import { EmptyState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getPaymentOptions } from '@/services/orderService'
import { formatBDT } from '@/utils/currency'
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/utils/orderLabels'

function readLast() {
  try {
    return JSON.parse(sessionStorage.getItem('cb_last_order') ?? 'null')
  } catch {
    return null
  }
}

export default function OrderConfirmation() {
  useDocumentTitle('Order placed')
  const location = useLocation()
  const order = location.state ?? readLast()
  const options = useAsync(getPaymentOptions, [])

  if (!order?.order_number) {
    return (
      <div className="container-page">
        <EmptyState title="No recent order found"
          message="If you placed an order, you can look it up with your order number and mobile number."
          action={<Link to="/track" className="btn-primary">Track an order</Link>} />
      </div>
    )
  }

  const manual = order.payment_method === 'bkash_manual' || order.payment_method === 'nagad_manual'
  const instruction = options.data?.instructions?.[order.payment_method]

  return (
    <section className="container-page max-w-2xl py-12">
      <h1 className="text-4xl text-maroon">Thank you, your order is placed</h1>
      <p className="mt-3">Your order number is</p>
      <p className="font-display text-3xl text-maroon" aria-label={`Order number ${order.order_number}`}>
        {order.order_number}
      </p>
      <p className="mt-2 text-sm">Please save this number. You will need it, with your mobile number, to track your order.</p>

      <dl className="mt-6 grid grid-cols-[9rem_1fr] gap-y-2 text-sm">
        <dt className="font-medium">Total</dt><dd>{formatBDT(order.total_amount)}</dd>
        <dt className="font-medium">Payment method</dt><dd>{PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method}</dd>
        <dt className="font-medium">Payment status</dt><dd>{PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}</dd>
      </dl>

      <div className="mt-6 text-sm">
        {order.payment_method === 'cod' && <p>Please keep the exact amount ready to pay in cash on delivery.</p>}
        {manual && (
          <>
            <p>We will verify your payment before confirming your order.</p>
            {instruction && <p className="mt-2 whitespace-pre-line">{instruction}</p>}
          </>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to="/track" className="btn-primary">Track this order</Link>
        <Link to="/account/orders" className="btn-secondary">My orders</Link>
        <Link to="/shop" className="btn-secondary">Continue shopping</Link>
      </div>
    </section>
  )
}