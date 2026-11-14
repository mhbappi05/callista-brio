import { supabase } from '@/lib/supabaseClient'

function db() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}

const MESSAGES = {
  forbidden: 'You don’t have permission for this action.',
  payment_not_found: 'That payment no longer exists.',
  payment_already_final: 'This payment is already final and can’t be changed.',
  payment_not_refundable: 'Only paid payments can be refunded.',
  gateway_payments_are_webhook_verified: 'Gateway payments are verified automatically by the provider.',
  invalid_amount: 'Enter a valid amount.',
  refund_exceeds_payment: 'That is more than the amount still refundable.',
  refund_not_found: 'That refund no longer exists.',
  invalid_refund_state: 'This refund can’t move to that step.',
}

async function rpc(name, args) {
  const { data, error } = await db().rpc(name, args)
  if (error) {
    throw Object.assign(new Error(MESSAGES[error.message] ?? 'That didn’t work. Please try again.'), {
      code: error.message,
    })
  }
  return data
}

export async function listPayments({ status = '', method = '' } = {}) {
  let q = db()
    .from('payments')
    .select(`
      id, order_id, method, provider, amount, currency, status,
      manual_transaction_id, manual_sender_phone, verification_metadata, verified_at, created_at,
      order:orders(order_number, order_status, customer_name, customer_phone)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  if (status) q = q.eq('status', status)
  if (method) q = q.eq('method', method)
  const { data, error } = await q
  if (error) throw error
  return data
}

export const verifyPayment = (id, approved, note) =>
  rpc('admin_verify_payment', { p_payment_id: id, p_approved: approved, p_note: note || null })

export const flagPayment = (id, note) =>
  rpc('admin_flag_payment', { p_payment_id: id, p_note: note || null })

export const requestRefund = (paymentId, amount, reason) =>
  rpc('admin_request_refund', { p_payment_id: paymentId, p_amount: amount, p_reason: reason || null })

export async function listRefunds() {
  const { data, error } = await db()
    .from('refunds')
    .select(`
      id, amount, reason, status, created_at,
      payment:payments(method, amount, status),
      order:orders(order_number, customer_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return data
}

export const processRefund = (id, action, note) =>
  rpc('admin_process_refund', { p_refund_id: id, p_action: action, p_note: note || null })