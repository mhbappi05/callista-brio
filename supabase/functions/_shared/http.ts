import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  })
}

export function fail(req: Request, status: number, code: string, message: string, details?: unknown): Response {
  return json(req, status, { error: { code, message, details } })
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('cf-connecting-ip') ?? 'unknown'
}

export async function readJson(req: Request, maxChars = 50_000): Promise<Record<string, unknown> | null> {
  const text = await req.text()
  if (text.length > maxChars) return null
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch {
    return null
  }
}

// True when the caller is OVER the limit. If the limiter itself fails we allow
// the request (fail open) so a database hiccup does not take checkout down.
export async function rateLimited(
  admin: SupabaseClient, key: string, limit: number, windowSeconds: number,
): Promise<boolean> {
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_key: key, p_limit: limit, p_window_seconds: windowSeconds,
  })
  if (error) {
    console.error('rate limit check failed', error)
    return false
  }
  return data === false
}

// Identifies the signed-in user from the bearer token. Guests send the public
// anon key, which is not a user token, so they come back as null.
export async function verifiedUserId(admin: SupabaseClient, req: Request): Promise<string | null> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data, error } = await admin.auth.getUser(token)
  return error ? null : data.user?.id ?? null
}

const KNOWN: Record<string, [number, string]> = {
  payment_method_unavailable: [400, 'That payment method isn’t available right now.'],
  invalid_name: [400, 'Please enter your name.'],
  invalid_phone: [400, 'Please enter a valid Bangladesh mobile number.'],
  invalid_email: [400, 'Please enter a valid email address.'],
  invalid_address: [400, 'Please complete your delivery address.'],
  invalid_items: [400, 'Your cart could not be read. Please review it and try again.'],
  product_unavailable: [409, 'An item in your cart is no longer available.'],
  variant_unavailable: [409, 'An option you chose is no longer available.'],
  insufficient_stock: [409, 'Some items don’t have enough stock for your quantities.'],
  delivery_unavailable: [422, 'We can’t deliver to that address right now.'],
  invalid_coupon: [422, 'That coupon code isn’t valid.'],
  coupon_min_order_not_met: [422, 'Your order is below the minimum for this coupon.'],
  coupon_exhausted: [422, 'This coupon has reached its usage limit.'],
  coupon_already_used: [422, 'You have already used this coupon.'],
}

export function dbError(
  req: Request, error: { code?: string; message?: string; details?: string },
): Response {
  const code = String(error.message ?? '')
  const known = KNOWN[code]
  if (known) {
    let details: unknown
    try {
      details = error.details ? JSON.parse(error.details) : undefined
    } catch {
      details = undefined
    }
    return fail(req, known[0], code, known[1], details)
  }
  if (error.code === '23505' && code.includes('payments_manual_txn_key')) {
    return fail(req, 409, 'duplicate_transaction', 'That transaction ID has already been used.')
  }
  console.error('unexpected database error', error)
  return fail(req, 500, 'server_error', 'Something went wrong on our side. Please try again.')
}