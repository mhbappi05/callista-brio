import { corsHeaders } from '../_shared/cors.ts'
import { adminClient, clientIp, fail, json, rateLimited, readJson } from '../_shared/http.ts'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

function normalizeBDPhone(input: string): string | null {
  const d = input.replace(/\D/g, '')
  let n: string | null = null
  if (/^8801\d{9}$/.test(d)) n = `+${d}`
  else if (/^01\d{9}$/.test(d)) n = `+88${d}`
  return n && /^\+8801[3-9]\d{8}$/.test(n) ? n : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Method not allowed.')

  const admin = adminClient()
  // Strict limit: this endpoint takes an order number and a phone number.
  if (await rateLimited(admin, `track-order:${clientIp(req)}`, 10, 600)) {
    return fail(req, 429, 'rate_limited', 'Too many attempts. Please wait a few minutes and try again.')
  }

  const body = await readJson(req, 2_000)
  if (!body) return fail(req, 400, 'invalid_request', 'The request was not valid.')

  const orderNumber = str(body.order_number, 30).trim().toUpperCase()
  const phone = normalizeBDPhone(str(body.phone, 20))
  const notFound = () =>
    fail(req, 404, 'order_not_found', 'We couldn’t find an order matching those details.')
  if (!orderNumber || !phone) return notFound()

  const { data, error } = await admin
    .from('orders')
    .select(`
      order_number, order_status, payment_method, payment_status, placed_at,
      subtotal, discount_total, delivery_fee, total_amount, delivery_zone_name,
      shipping_address, courier_name, tracking_number, tracking_url,
      order_items ( product_name, variant_description, product_image, quantity, unit_price, line_total ),
      order_status_history ( to_status, created_at )
    `)
    .eq('order_number', orderNumber)
    .eq('customer_phone', phone)
    .maybeSingle()

  if (error) {
    console.error('track-order query failed', error)
    return fail(req, 500, 'server_error', 'Something went wrong on our side. Please try again.')
  }
  // Same response whether the number or the phone was wrong.
  if (!data) return notFound()
  return json(req, 200, data)
})