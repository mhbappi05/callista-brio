export const ORDER_STATUS_LABELS = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  processing: 'Processing',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_STATUS_LABELS = {
  unpaid: 'Unpaid',
  pending: 'Awaiting verification',
  paid: 'Paid',
  failed: 'Payment failed',
  partially_refunded: 'Partially refunded',
  refunded: 'Refunded',
  requires_review: 'Under review',
}

export const PAYMENT_METHOD_LABELS = {
  cod: 'Cash on delivery',
  bkash_manual: 'bKash (manual payment)',
  nagad_manual: 'Nagad (manual payment)',
  gateway: 'Online payment',
}

export const formatDhakaDate = (iso) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium', timeStyle: 'short' })

export const NEXT_STATUSES = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
}

export const RETURN_STATUS_LABELS = {
  requested: 'Requested',
  approved: 'Approved',
  received: 'Item received',
  completed: 'Completed',
  rejected: 'Declined',
}