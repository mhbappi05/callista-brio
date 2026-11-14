import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Field from '@/components/common/Field.jsx'
import { useAuth } from '@/context/AuthContext'
import { useCart } from '@/context/CartContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listAddresses } from '@/services/addressService'
import { createOrder, getPaymentOptions, quoteOrder } from '@/services/orderService'
import { formatBDT } from '@/utils/currency'
import { DISTRICTS } from '@/utils/districts'
import { PAYMENT_METHOD_LABELS } from '@/utils/orderLabels'
import { normalizeBDPhone } from '@/utils/phone'

const MANUAL = ['bkash_manual', 'nagad_manual']
const STOCK_CODES = ['insufficient_stock', 'product_unavailable', 'variant_unavailable']
const EMAIL_RE = /^[^@\s]+@[^@\s]+$/
const input = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2'

const newKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `k-${Date.now()}-${Math.random().toString(36).slice(2)}`

function ariaFor(errors, id) {
  return { 'aria-invalid': !!errors[id], 'aria-describedby': errors[id] ? `${id}-error` : undefined }
}

export default function Checkout() {
  useDocumentTitle('Checkout')
  const { user, profile } = useAuth()
  const cart = useCart()
  const navigate = useNavigate()
  const placedRef = useRef(false)
  const defaultAppliedRef = useRef(false)
  // One key per checkout visit: a retry after a timeout replays the same order instead of duplicating it.
  const [idempotencyKey] = useState(newKey)

  const options = useAsync(getPaymentOptions, [])
  const saved = useAsync(() => (user ? listAddresses(user.id) : Promise.resolve([])), [user?.id])

  const [contact, setContact] = useState({ name: '', phone: '', email: '' })
  const [addr, setAddr] = useState({ district: '', city_or_area: '', postal_code: '', address_line: '', delivery_instructions: '' })
  const [method, setMethod] = useState('')
  const [payment, setPayment] = useState({ transaction_id: '', sender_phone: '' })
  const [note, setNote] = useState('')
  const [couponInput, setCouponInput] = useState('')
  const [appliedCode, setAppliedCode] = useState('')
  const [couponError, setCouponError] = useState('')
  const [quote, setQuote] = useState({ data: null, loading: true, error: null })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const orderItems = useMemo(
    () =>
      cart.items
        .filter((i) => i.status === 'ok' || i.status === 'limited')
        .map((i) => ({ product_id: i.productId, variant_id: i.variantId, quantity: i.effectiveQuantity })),
    [cart.items]
  )
  const itemsKey = JSON.stringify(orderItems)
  const skipped = cart.items.filter((i) => i.status === 'unavailable' || i.status === 'sold_out').length

  // Prefill for signed-in customers
  useEffect(() => {
    if (!user) return
    setContact((c) => ({
      name: c.name || profile?.full_name || '',
      phone: c.phone || profile?.phone || '',
      email: c.email || user.email || '',
    }))
  }, [user, profile])

  function fillFromSaved(id) {
    const a = saved.data?.find((x) => x.id === id)
    if (!a) return
    setAddr({
      district: a.district,
      city_or_area: a.city_or_area,
      postal_code: a.postal_code ?? '',
      address_line: a.address_line,
      delivery_instructions: a.delivery_instructions ?? '',
    })
    setContact((c) => ({ ...c, name: c.name || a.recipient_name, phone: c.phone || a.phone }))
  }

  // Use the default saved address once, on first load
  useEffect(() => {
    if (defaultAppliedRef.current || !saved.data?.length) return
    defaultAppliedRef.current = true
    const def = saved.data.find((a) => a.is_default)
    if (def) fillFromSaved(def.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved.data])

  // Auto-select the payment method when only one is enabled
  useEffect(() => {
    if (!method && options.data?.enabled.length === 1) setMethod(options.data.enabled[0])
  }, [options.data, method])

  // Server-side price quote (subtotal, delivery fee, discount, total)
  useEffect(() => {
    if (!orderItems.length) return undefined
    let cancelled = false
    setQuote((q) => ({ ...q, loading: true, error: null }))
    quoteOrder({
      items: orderItems,
      district: addr.district,
      couponCode: appliedCode,
      phone: normalizeBDPhone(contact.phone) ?? '',
    })
      .then((data) => {
        if (!cancelled) setQuote({ data, loading: false, error: null })
      })
      .catch((error) => {
        if (cancelled) return
        setQuote({ data: null, loading: false, error })
        if (appliedCode && error.code?.startsWith('coupon')) {
          setAppliedCode('')
          setCouponError(error.message)
        }
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, addr.district, appliedCode])

  async function applyCoupon() {
    const code = couponInput.trim().toUpperCase()
    if (!code) return
    setCouponError('')
    try {
      await quoteOrder({
        items: orderItems, district: addr.district, couponCode: code,
        phone: normalizeBDPhone(contact.phone) ?? '',
      })
      setAppliedCode(code)
      setCouponInput('')
    } catch (err) {
      setCouponError(err.message)
    }
  }

  function validate() {
    const e = {}
    if (!contact.name.trim()) e['co-name'] = 'Enter your name.'
    if (!normalizeBDPhone(contact.phone)) e['co-phone'] = 'Enter a valid Bangladesh mobile number, e.g. 01712345678.'
    if (contact.email.trim() && !EMAIL_RE.test(contact.email.trim())) e['co-email'] = 'Enter a valid email address, or leave it blank.'
    if (!addr.district) e['co-district'] = 'Choose a district.'
    if (!addr.city_or_area.trim()) e['co-city'] = 'Enter your city or area.'
    if (!addr.address_line.trim()) e['co-line'] = 'Enter your street address.'
    if (!method) e['co-method'] = 'Choose a payment method.'
    if (MANUAL.includes(method)) {
      if (!payment.transaction_id.trim()) e['co-txn'] = 'Enter the transaction ID from your payment.'
      if (payment.sender_phone.trim() && !normalizeBDPhone(payment.sender_phone)) e['co-sender'] = 'Enter a valid mobile number.'
    }
    return e
  }

  async function placeOrder(ev) {
    ev.preventDefault()
    if (submitting) return
    const found = validate()
    setErrors(found)
    setSubmitError(null)
    const first = Object.keys(found)[0]
    if (first) {
      document.getElementById(first)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const result = await createOrder({
        idempotency_key: idempotencyKey,
        customer: { name: contact.name.trim(), phone: contact.phone, email: contact.email.trim() },
        address: { ...addr, recipient_name: contact.name.trim(), phone: contact.phone },
        payment_method: method,
        payment: MANUAL.includes(method)
          ? { transaction_id: payment.transaction_id.trim(), sender_phone: payment.sender_phone }
          : {},
        coupon_code: appliedCode,
        note: note.trim(),
        items: orderItems,
      })
      placedRef.current = true
      try {
        sessionStorage.setItem('cb_last_order', JSON.stringify(result))
      } catch {
        // Not critical: the router state still carries the result.
      }
      navigate('/order-confirmation', { replace: true, state: result })
      cart.clear()
    } catch (err) {
      if (STOCK_CODES.includes(err.code)) cart.reload()
      setSubmitError(err)
      setSubmitting(false)
    }
  }

  if (cart.ready && !cart.loading && !orderItems.length && !placedRef.current) {
    return <Navigate to="/cart" replace />
  }
  if (!cart.ready || (cart.loading && !orderItems.length)) {
    return <p className="container-page py-16" aria-busy="true">Loading…</p>
  }

  const q = quote.data
  const enabled = options.data?.enabled ?? []
  const instruction = options.data?.instructions?.[method]

  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">Checkout</h1>

      {!user && (
        <p className="mt-3 text-sm">
          Have an account? <Link to="/auth?next=/checkout" className="underline">Sign in</Link> to use saved addresses, or continue as a guest.
        </p>
      )}
      {skipped > 0 && (
        <p role="status" className="mt-3 text-sm text-maroon">
          {skipped} {skipped === 1 ? 'item' : 'items'} in your cart can’t be ordered and will be left out.{' '}
          <Link to="/cart" className="underline">Review cart</Link>
        </p>
      )}

      <form onSubmit={placeOrder} noValidate className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-10">
          {/* 1. Contact */}
          <fieldset className="space-y-4">
            <legend className="font-display text-2xl text-maroon">1. Contact details</legend>
            <Field id="co-name" label="Full name *" error={errors['co-name']}>
              <input id="co-name" className={input} autoComplete="name" value={contact.name}
                onChange={(e) => setContact({ ...contact, name: e.target.value })} {...ariaFor(errors, 'co-name')} />
            </Field>
            <Field id="co-phone" label="Mobile number *" error={errors['co-phone']}>
              <input id="co-phone" className={input} inputMode="tel" autoComplete="tel" value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })} {...ariaFor(errors, 'co-phone')} />
            </Field>
            <Field id="co-email" label="Email (optional)" error={errors['co-email']}>
              <input id="co-email" type="email" className={input} autoComplete="email" value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })} {...ariaFor(errors, 'co-email')} />
            </Field>
          </fieldset>

          {/* 2. Address */}
          <fieldset className="space-y-4">
            <legend className="font-display text-2xl text-maroon">2. Shipping address</legend>
            {saved.data?.length > 0 && (
              <div>
                <label htmlFor="co-saved" className="text-sm font-medium">Use a saved address</label>
                <select id="co-saved" className={input} defaultValue="" onChange={(e) => fillFromSaved(e.target.value)}>
                  <option value="">Choose…</option>
                  {saved.data.map((a) => (
                    <option key={a.id} value={a.id}>{a.recipient_name}, {a.city_or_area}, {a.district}</option>
                  ))}
                </select>
              </div>
            )}
            <Field id="co-district" label="District *" error={errors['co-district']}>
              <select id="co-district" className={input} value={addr.district}
                onChange={(e) => setAddr({ ...addr, district: e.target.value })} {...ariaFor(errors, 'co-district')}>
                <option value="">Select a district</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </Field>
            <Field id="co-city" label="City or area *" error={errors['co-city']}>
              <input id="co-city" className={input} value={addr.city_or_area}
                onChange={(e) => setAddr({ ...addr, city_or_area: e.target.value })} {...ariaFor(errors, 'co-city')} />
            </Field>
            <Field id="co-line" label="Street address *" error={errors['co-line']}>
              <textarea id="co-line" rows={2} className={input} autoComplete="street-address" value={addr.address_line}
                onChange={(e) => setAddr({ ...addr, address_line: e.target.value })} {...ariaFor(errors, 'co-line')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="co-postal" label="Postal code (optional)">
                <input id="co-postal" className={input} inputMode="numeric" maxLength={12} value={addr.postal_code}
                  onChange={(e) => setAddr({ ...addr, postal_code: e.target.value })} />
              </Field>
              <Field id="co-instructions" label="Delivery instructions (optional)">
                <input id="co-instructions" className={input} maxLength={300} value={addr.delivery_instructions}
                  onChange={(e) => setAddr({ ...addr, delivery_instructions: e.target.value })} />
              </Field>
            </div>
          </fieldset>

          {/* 3. Delivery */}
          <section aria-labelledby="co-delivery">
            <h2 id="co-delivery" className="font-display text-2xl text-maroon">3. Delivery</h2>
            <p className="mt-2 text-sm" aria-live="polite">
              {!addr.district ? 'Choose a district to see your delivery charge.'
                : quote.loading ? 'Calculating…'
                : q?.zone ? `${q.zone.name}: ${q.delivery_fee === 0 ? 'Free' : formatBDT(q.delivery_fee)}`
                : 'Delivery charge not available.'}
            </p>
          </section>

          {/* 4. Payment */}
          <fieldset>
            <legend className="font-display text-2xl text-maroon">4. Payment method</legend>
            {options.loading && !options.data ? <p className="mt-2 text-sm">Loading…</p>
              : enabled.length === 0 ? (
                <p role="alert" className="mt-2 text-sm text-maroon">
                  No payment method is available right now. Please contact us to place your order.
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  {enabled.map((m, idx) => (
                    <label key={m} className="flex items-center gap-3 border border-maroon/30 p-3">
                      <input type="radio" name="payment" id={idx === 0 ? 'co-method' : undefined} value={m}
                        checked={method === m} onChange={() => setMethod(m)}
                        aria-describedby={errors['co-method'] ? 'co-method-error' : undefined} />
                      {PAYMENT_METHOD_LABELS[m]}
                    </label>
                  ))}
                </div>
              )}
            {errors['co-method'] && <p id="co-method-error" role="alert" className="mt-1 text-sm text-maroon">{errors['co-method']}</p>}

            {method === 'cod' && <p className="mt-3 text-sm">Pay in cash when your order is delivered.</p>}
            {MANUAL.includes(method) && (
              <div className="mt-4 space-y-4">
                <p className="text-sm whitespace-pre-line">
                  {instruction || 'Payment instructions will be shared once you place your order.'}
                </p>
                <Field id="co-txn" label="Transaction ID *" error={errors['co-txn']}>
                  <input id="co-txn" className={input} maxLength={64} value={payment.transaction_id}
                    onChange={(e) => setPayment({ ...payment, transaction_id: e.target.value })} {...ariaFor(errors, 'co-txn')} />
                </Field>
                <Field id="co-sender" label="Number you paid from (optional)" error={errors['co-sender']}>
                  <input id="co-sender" className={input} inputMode="tel" value={payment.sender_phone}
                    onChange={(e) => setPayment({ ...payment, sender_phone: e.target.value })} {...ariaFor(errors, 'co-sender')} />
                </Field>
                <p className="text-xs opacity-80">We verify manual payments before confirming your order. Never share PINs or OTPs.</p>
              </div>
            )}
          </fieldset>

          <Field id="co-note" label="Order note (optional)">
            <textarea id="co-note" rows={2} maxLength={500} className={input} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>

        {/* 5. Review */}
        <aside className="h-fit border border-maroon/20 p-5 lg:sticky lg:top-6">
          <h2 className="font-display text-2xl text-maroon">5. Review your order</h2>
          <ul className="mt-4 divide-y divide-maroon/15">
            {cart.items.filter((i) => i.product && (i.status === 'ok' || i.status === 'limited')).map((i) => (
              <li key={i.key} className="flex justify-between gap-3 py-2 text-sm">
                <span>{i.product.name}{i.variant ? ` (${i.variant.name})` : ''} × {i.effectiveQuantity}</span>
                <span>{formatBDT(i.lineTotal)}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4">
            {appliedCode ? (
              <p className="flex items-center justify-between text-sm">
                <span>Coupon <strong>{appliedCode}</strong> applied</span>
                <button type="button" className="underline" onClick={() => setAppliedCode('')}>Remove</button>
              </p>
            ) : (
              <div>
                <label htmlFor="co-coupon" className="text-sm font-medium">Coupon code</label>
                <div className="mt-1 flex gap-2">
                  <input id="co-coupon" className="w-full border border-maroon/30 bg-cream px-3 py-2 uppercase"
                    value={couponInput} onChange={(e) => setCouponInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); applyCoupon() } }} />
                  <button type="button" className="btn-secondary !px-4 !py-2" onClick={applyCoupon}>Apply</button>
                </div>
              </div>
            )}
            {couponError && <p role="alert" className="mt-1 text-sm text-maroon">{couponError}</p>}
          </div>

          <dl className="mt-4 space-y-1 text-sm" aria-live="polite">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{q ? formatBDT(q.subtotal) : '…'}</dd></div>
            {q?.discount_total > 0 && (
              <div className="flex justify-between"><dt>Discount</dt><dd>−{formatBDT(q.discount_total)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>{!addr.district ? 'Choose a district' : q?.delivery_fee == null ? '…' : q.delivery_fee === 0 ? 'Free' : formatBDT(q.delivery_fee)}</dd>
            </div>
            <div className="flex justify-between border-t border-maroon/20 pt-2 text-lg font-semibold text-maroon">
              <dt>Total</dt><dd>{q ? formatBDT(q.total_amount) : '…'}</dd>
            </div>
          </dl>

          {quote.error && (
            <p role="alert" className="mt-3 text-sm text-maroon">
              {quote.error.message}{' '}
              {STOCK_CODES.includes(quote.error.code) && <Link to="/cart" className="underline">Review cart</Link>}
            </p>
          )}
          {submitError && (
            <p role="alert" className="mt-3 text-sm text-maroon">
              {submitError.message}{' '}
              {STOCK_CODES.includes(submitError.code) && <Link to="/cart" className="underline">Review cart</Link>}
            </p>
          )}

          <button type="submit" className="btn-primary mt-5 w-full disabled:opacity-50"
            disabled={submitting || quote.loading || !!quote.error || enabled.length === 0}>
            {submitting ? 'Placing order…' : 'Place order'}
          </button>
          <p className="mt-2 text-xs opacity-70">
            The final total is confirmed by our server when you place the order.
          </p>
        </aside>
      </form>
    </section>
  )
}