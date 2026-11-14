import { adminClient, fail, json } from '../_shared/http.ts'
import { getAdapter } from '../_shared/gateway.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(req, 405, 'method_not_allowed', 'Method not allowed.')

  const adapter = getAdapter()
  if (!adapter) {
    return fail(req, 501, 'gateway_not_configured', 'No payment gateway is configured yet.')
  }

  const rawBody = await req.text()
  if (rawBody.length > 100_000) return fail(req, 413, 'too_large', 'Payload too large.')

  let event
  try {
    event = await adapter.verifyAndParse(req, rawBody)
  } catch (err) {
    console.error('webhook parse error', err)
    return fail(req, 400, 'invalid_request', 'The notification could not be read.')
  }
  if (!event) return fail(req, 401, 'invalid_signature', 'Verification failed.')

  const admin = adminClient()
  const { data, error } = await admin.rpc('apply_gateway_result', {
    p: {
      provider: adapter.name,
      event_id: event.eventId,
      provider_reference: event.providerReference,
      status: event.status,
      amount: event.amount,
      currency: event.currency,
      raw: event.raw,
    },
  })
  if (error) {
    console.error('apply_gateway_result failed', error)
    // 500 makes the provider retry; replays are safe because of the event id.
    return fail(req, 500, 'server_error', 'Could not record the payment result.')
  }
  return json(req, 200, data)
})