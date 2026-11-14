import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { productImageUrl } from '@/lib/storageUrls'
import { trackOrder } from '@/services/orderService'
import { formatBDT } from '@/utils/currency'
import {
  ORDER_STATUS_LABELS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, formatDhakaDate,
} from '@/utils/orderLabels'
import { normalizeBDPhone } from '@/utils/phone'

const input = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2'

export default function TrackOrder() {
  useDocumentTitle('Track your order')
  const [orderNumber, setOrderNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [order, setOrder] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    const found = {}
    if (!orderNumber.trim()) found['tr-number'] = 'Enter your order number.'
    if (!normalizeBDPhone(phone)) found['tr-phone'] = 'Enter the mobile number used for the order.'
    setErrors(found)
    if (Object.keys(found).length) return

    setBusy(true)
    setError('')
    setOrder(null)
    try {
      setOrder(await trackOrder(orderNumber.trim(), phone))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const history = [...(order?.order_status_history ?? [])].sort(
    (a, b) => new Date(a.created_at) - new Date(b.created_at)
  )
  const safeTrackingUrl = /^https?:\/\//i.test(order?.tracking_url ?? '') ? order.tracking_url : null

  return (
    <section className="container-page max-w-2xl py-10">
      <h1 className="text-4xl text-maroon">Track your order</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <Field id="tr-number" label="Order number" error={errors['tr-number']}>
          <input id="tr-number" className={`${input} uppercase`} placeholder="CB-261114-00001" value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)} aria-invalid={!!errors['tr-number']}
            aria-describedby={errors['tr-number'] ? 'tr-number-error' : undefined} />
        </Field>
        <Field id="tr-phone" label="Mobile number used for the order" error={errors['tr-phone']}>
          <input id="tr-phone" className={input} inputMode="tel" value={phone}
            onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors['tr-phone']}
            aria-describedby={errors['tr-phone'] ? 'tr-phone-error' : undefined} />
        </Field>
        {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Looking…' : 'Track order'}</button>
      </form>

      {order && (
        <div className="mt-10">
          <h2 className="text-3xl text-maroon">{order.order_number}</h2>
          <p className="mt-1 text-sm">Placed {formatDhakaDate(order.placed_at)}</p>

          <p className="mt-4 text-lg font-medium">{ORDER_STATUS_LABELS[order.order_status] ?? order.order_status}</p>
          <p className="text-sm">
            Payment: {PAYMENT_METHOD_LABELS[order.payment_method] ?? order.payment_method} ·{' '}
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </p>

          {(order.courier_name || order.tracking_number) && (
            <p className="mt-3 text-sm">
              Courier: {order.courier_name ?? '—'}
              {order.tracking_number && <> · Tracking no. {order.tracking_number}</>}
              {safeTrackingUrl && (
                <> · <a href={safeTrackingUrl} target="_blank" rel="noopener noreferrer" className="underline">Track with courier</a></>
              )}
            </p>
          )}

          <h3 className="mt-6 font-display text-2xl text-maroon">Progress</h3>
          <ol className="mt-2 space-y-1 text-sm">
            {history.map((h) => (
              <li key={`${h.to_status}-${h.created_at}`}>
                {ORDER_STATUS_LABELS[h.to_status] ?? h.to_status} <span className="opacity-70">· {formatDhakaDate(h.created_at)}</span>
              </li>
            ))}
          </ol>

          <h3 className="mt-6 font-display text-2xl text-maroon">Items</h3>
          <ul className="mt-2 divide-y divide-maroon/15">
            {order.order_items.map((it, idx) => (
              <li key={idx} className="flex gap-3 py-3 text-sm">
                <img src={productImageUrl(it.product_image)} alt="" className="h-14 w-14 object-cover" />
                <div className="flex-1">
                  <p>{it.product_name}</p>
                  {it.variant_description && <p className="opacity-70">{it.variant_description}</p>}
                  <p className="opacity-70">Qty {it.quantity}</p>
                </div>
                <p>{formatBDT(it.line_total)}</p>
              </li>
            ))}
          </ul>

          <dl className="mt-4 space-y-1 text-sm">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBDT(order.subtotal)}</dd></div>
            {Number(order.discount_total) > 0 && (
              <div className="flex justify-between"><dt>Discount</dt><dd>−{formatBDT(order.discount_total)}</dd></div>
            )}
            <div className="flex justify-between"><dt>Delivery ({order.delivery_zone_name})</dt><dd>{formatBDT(order.delivery_fee)}</dd></div>
            <div className="flex justify-between border-t border-maroon/20 pt-2 font-semibold text-maroon">
              <dt>Total</dt><dd>{formatBDT(order.total_amount)}</dd>
            </div>
          </dl>

          <p className="mt-4 text-sm">
            Delivering to: {order.shipping_address.address_line}, {order.shipping_address.city_or_area}, {order.shipping_address.district}
          </p>
        </div>
      )}
    </section>
  )
}