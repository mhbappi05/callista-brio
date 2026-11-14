export const OPEN_RETURN = ['requested', 'approved', 'received']

const DAY = 86_400_000

// Mirrors request_return() in the database:
// allowed while now <= delivered_at + window_days.
export function returnWindowOpen(deliveredAt, policy, now = Date.now()) {
    if (!policy?.enabled) return false
    const days = Number(policy.window_days)
    if (!Number.isInteger(days) || days < 1 || !deliveredAt) return false
    return now <= new Date(deliveredAt).getTime() + days * DAY
}

export function returnDeadline(deliveredAt, policy) {
    const days = Number(policy?.window_days)
    if (!deliveredAt || !Number.isInteger(days) || days < 1) return null
    return new Date(new Date(deliveredAt).getTime() + days * DAY)
}

// Turns { [orderItemId]: quantity } into the payload the database expects.
export function buildReturnItems(selection) {
    return Object.entries(selection)
        .filter(([, qty]) => Number(qty) >= 1)
        .map(([order_item_id, qty]) => ({ order_item_id, quantity: Number(qty) }))
}