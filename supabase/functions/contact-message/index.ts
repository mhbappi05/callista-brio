import { corsHeaders } from '../_shared/cors.ts'
import { adminClient, clientIp, fail, json, rateLimited, readJson } from '../_shared/http.ts'

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const countLinks = (s: string) => (s.match(/https?:\/\/|www\./gi) ?? []).length

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Method not allowed.')

  const admin = adminClient()
  if (await rateLimited(admin, `contact:${clientIp(req)}`, 5, 3600)) {
    return fail(req, 429, 'rate_limited', 'You’ve sent several messages recently. Please try again in a little while.')
  }

  const body = await readJson(req, 10_000)
  if (!body) return fail(req, 400, 'invalid_request', 'The request was not valid.')

  // A hidden field that real visitors never fill in. Pretend it worked so bots don't adapt.
  if (str(body.website, 200).trim()) return json(req, 200, { ok: true })

  const name = str(body.name, 120).trim()
  const email = str(body.email, 254).trim().toLowerCase()
  const subject = str(body.subject, 150).trim()
  const message = str(body.message, 3001).trim()

  if (!name || !EMAIL_RE.test(email) || !subject || !message) {
    return fail(req, 400, 'invalid_message', 'Please fill in your name, a valid email, a subject and your message.')
  }
  if (message.length > 3000) {
    return fail(req, 400, 'message_too_long', 'Please keep your message under 3,000 characters.')
  }
  if (countLinks(message) > 3 || countLinks(subject) > 0) {
    return fail(req, 400, 'too_many_links', 'Please remove the links from your message.')
  }
  if (await rateLimited(admin, `contact-email:${email}`, 3, 3600)) {
    return fail(req, 429, 'rate_limited', 'You’ve sent several messages recently. Please try again in a little while.')
  }

  const { error } = await admin.from('contact_messages').insert({ name, email, subject, message })
  if (error) {
    console.error('contact-message insert failed', error)
    return fail(req, 500, 'server_error', 'Something went wrong on our side. Please try again.')
  }
  return json(req, 200, { ok: true })
})