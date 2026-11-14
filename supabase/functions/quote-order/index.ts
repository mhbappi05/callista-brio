import { corsHeaders } from '../_shared/cors.ts'
import {
  adminClient, clientIp, dbError, fail, json, rateLimited, readJson, verifiedUserId,
} from '../_shared/http.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Method not allowed.')

  const admin = adminClient()
  if (await rateLimited(admin, `quote-order:${clientIp(req)}`, 60, 600)) {
    return fail(req, 429, 'rate_limited', 'Too many requests. Please wait a moment.')
  }

  const body = await readJson(req)
  if (!body) return fail(req, 400, 'invalid_request', 'The request was not valid.')

  const raw = Array.isArray(body.items) ? body.items : []
  if (raw.length < 1 || raw.length > 50) return fail(req, 400, 'invalid_items', 'Your cart is empty.')
  const items: { product_id: string; variant_id: string | null; quantity: number }[] = []
  for (const it of raw) {
    const i = (it ?? {}) as Record<string, unknown>
    const q = i.quantity
    const badVariant = i.variant_id != null && (typeof i.variant_id !== 'string' || !UUID.test(i.variant_id))
    if (typeof i.product_id !== 'string' || !UUID.test(i.product_id) || badVariant ||
        typeof q !== 'number' || !Number.isInteger(q) || q < 1 || q > 20) {
      return fail(req, 400, 'invalid_items', 'Your cart could not be read.')
    }
    items.push({ product_id: i.product_id, variant_id: (i.variant_id as string | null) ?? null, quantity: q })
  }

  const userId = await verifiedUserId(admin, req)
  const { data, error } = await admin.rpc('quote_order', {
    p: {
      items,
      address: { district: str(body.district, 80) },
      coupon_code: str(body.coupon_code, 32),
      phone: str(body.phone, 20),
      user_id: userId,
    },
  })
  if (error) return dbError(req, error)
  return json(req, 200, data)
})  