import { supabase } from '@/lib/supabaseClient'

export const ORDERS_PAGE = 20

function db() {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
    return supabase
}

const clean = (s) => String(s ?? '').replace(/[%,()*\\"]/g, ' ').trim()

async function count(table, apply) {
    const { count: n, error } = await apply(db().from(table).select('id', { count: 'exact', head: true }))
    if (error) throw error
    return n ?? 0
}

export async function listOrders({ status = '', payment = '', q = '', page = 1 }) {
    let query = db()
        .from('orders')
        .select(
            'id, order_number, customer_name, customer_phone, order_status, payment_status, payment_method, total_amount, placed_at',
            { count: 'exact' }
        )
        .order('placed_at', { ascending: false })
    if (status) query = query.eq('order_status', status)
    if (payment) query = query.eq('payment_status', payment)
    const term = clean(q)
    if (term) {
        const p = `"%${term}%"`
        query = query.or(`order_number.ilike.${p},customer_phone.ilike.${p},customer_name.ilike.${p}`)
    }
    const from = (page - 1) * ORDERS_PAGE
    const { data, error, count: total } = await query.range(from, from + ORDERS_PAGE - 1)
    if (error) throw error
    return { items: data, total: total ?? 0 }
}

export async function getOrder(id) {
    const { data, error } = await db()
        .from('orders')
        .select('*, order_items(*), order_status_history(*), payments(*)')
        .eq('id', id)
        .maybeSingle()
    if (error) throw error
    return data
}

export async function setOrderStatus(orderId, status, note) {
    const { error } = await db().rpc('admin_set_order_status', {
        p_order_id: orderId, p_status: status, p_note: note || null,
    })
    if (error) throw error
}

export async function updateTracking(orderId, { courier, number, url }) {
    const { error } = await db().rpc('admin_update_tracking', {
        p_order_id: orderId,
        p_courier_name: courier || null,
        p_tracking_number: number || null,
        p_tracking_url: url || null,
    })
    if (error) throw error
}

export async function orderCounts() {
    const [pending, inProgress, shipped, paymentsToReview, returnsOpen] = await Promise.all([
        count('orders', (q) => q.eq('order_status', 'pending')),
        count('orders', (q) => q.in('order_status', ['confirmed', 'processing', 'packed'])),
        count('orders', (q) => q.eq('order_status', 'shipped')),
        count('payments', (q) => q.in('status', ['pending', 'requires_review'])),
        count('return_requests', (q) => q.eq('status', 'requested')),
    ])
    return { pending, inProgress, shipped, paymentsToReview, returnsOpen }
}

export async function listCustomers(q = '') {
    let query = db()
        .from('profiles')
        .select('id, full_name, email, phone, role, created_at')
        .order('created_at', { ascending: false })
        .limit(50)
    const term = clean(q)
    if (term) {
        const p = `"%${term}%"`
        query = query.or(`full_name.ilike.${p},email.ilike.${p},phone.ilike.${p}`)
    }
    const { data, error } = await query
    if (error) throw error
    return data
}

export async function listCustomerOrders(userId) {
    const { data, error } = await db()
        .from('orders')
        .select('id, order_number, order_status, payment_status, total_amount, placed_at')
        .eq('user_id', userId)
        .order('placed_at', { ascending: false })
        .limit(20)
    if (error) throw error
    return data
}

export async function listReturns(status) {
    const { data, error } = await db()
        .from('return_requests')
        .select(`
        id, order_id, request_type, reason, items, status, response_note, created_at,
        order:orders(order_number, customer_name, customer_phone, order_items(id, product_name, variant_description, quantity))
      `)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(100)
    if (error) throw error
    return data
}

export async function updateReturn(id, status, note) {
    const { error } = await db().rpc('admin_update_return', { p_id: id, p_status: status, p_note: note || null })
    if (error) throw error
}
