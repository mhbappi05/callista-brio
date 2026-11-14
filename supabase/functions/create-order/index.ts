import { corsHeaders } from '../_shared/cors.ts'
import {
  adminClient, clientIp, dbError, fail, json, rateLimited, readJson, verifiedUserId,
} from '../_shared/http.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
// 'gateway' is added in the payments phase.
const METHODS = ['cod', 'bkash_manual', 'nagad_manual']
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const obj = (v: unknown) => ((v && typeof v === 'object' ? v : {}) as Record<string, unknown>)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Method not allowed.')

  const admin = adminClient()
  if (await rateLimited(admin, `create-order:${clientIp(req)}`, 10, 600)) {
    return fail(req, 429, 'rate_limited', 'Too many attempts. Please wait a few minutes and try again.')
  }

  const body = await readJson(req)
  if (!body) return fail(req, 400, 'invalid_request', 'The request was not valid.')

  const key = str(body.idempotency_key, 100)
  if (key.length < 8) return fail(req, 400, 'invalid_request', 'The request was not valid.')

  const method = str(body.payment_method, 30)
  if (!METHODS.includes(method)) {
    return fail(req, 400, 'payment_method_unavailable', 'That payment method isn’t available right now.')
  }

  const raw = Array.isArray(body.items) ? body.items : []
  if (raw.length < 1 || raw.length > 50) return fail(req, 400, 'invalid_items', 'Your cart is empty.')
  const items: { product_id: string; variant_id: string | null; quantity: number }[] = []
  for (const it of raw) {
    const i = obj(it)
    const q = i.quantity
    const badVariant = i.variant_id != null && (typeof i.variant_id !== 'string' || !UUID.test(i.variant_id))
    if (typeof i.product_id !== 'string' || !UUID.test(i.product_id) || badVariant ||
        typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > 20) {
      return fail(req, 400, 'invalid_items', 'Your cart could not be read.')
    }
    items.push({ product_id: i.product_id, variant_id: (i.variant_id as string | null) ?? null, quantity: q })
  }

  const customer = obj(body.customer)
  const address = obj(body.address)
  const payment = obj(body.payment)

  // Whitelist exactly what create_order needs. Prices and totals from the
  // browser are never read; user_id comes only from the verified token.
  const payload = {
    idempotency_key: key,
    user_id: await verifiedUserId(admin, req),
    customer: {
      name: str(customer.name, 120),
      phone: str(customer.phone, 20),
      email: str(customer.email, 254),
    },
    address: {
      recipient_name: str(address.recipient_name, 120),
      phone: str(address.phone, 20),
      district: str(address.district, 80),
      city_or_area: str(address.city_or_area, 120),
      postal_code: str(address.postal_code, 12),
      address_line: str(address.address_line, 300),
      delivery_instructions: str(address.delivery_instructions, 300),
    },
    payment_method: method,
    payment: {
      transaction_id: str(payment.transaction_id, 64),
      sender_phone: str(payment.sender_phone, 20),
    },
    coupon_code: str(body.coupon_code, 32),
    note: str(body.note, 500),
    items,
  }

  let result = await admin.rpc('create_order', { p: payload })
  // Two identical requests racing: the loser hits the unique key; retrying replays the winner.
  if (result.error?.code === '23505' && String(result.error.message).includes('idempotency_key')) {
    result = await admin.rpc('create_order', { p: payload })
  }
  if (result.error) return dbError(req, result.error)

  return json(req, 200, { ...result.data, payment_method: method })
})