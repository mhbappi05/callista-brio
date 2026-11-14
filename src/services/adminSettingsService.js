import { supabase } from '@/lib/supabaseClient'

function db() {
    if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
    return supabase
}

// ----------------------------------------------------------------- coupons
export async function listCoupons() {
    const { data, error } = await db().from('coupons').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return data
}

export async function saveCoupon(id, values) {
    const q = id ? db().from('coupons').update(values).eq('id', id) : db().from('coupons').insert(values)
    const { error } = await q
    if (error) throw error
}

// ---------------------------------------------------------------- settings
// Only public, non-secret settings live here. Never store payment secrets.
export async function getSettings(keys) {
    const { data, error } = await db().from('store_settings').select('key, value').in('key', keys)
    if (error) throw error
    return Object.fromEntries(data.map((r) => [r.key, r.value]))
}

export async function saveSetting(key, value) {
    const { error } = await db().from('store_settings').upsert({ key, value, is_public: true }, { onConflict: 'key' })
    if (error) throw error
}

// ----------------------------------------------------------------- zones
export async function listZones() {
    const { data, error } = await db().from('delivery_zones').select('*').order('display_order')
    if (error) throw error
    return data
}

export async function saveZone(id, values) {
    const q = id ? db().from('delivery_zones').update(values).eq('id', id) : db().from('delivery_zones').insert(values)
    const { error } = await q
    if (error) {
        if (error.code === '23505' && String(error.message).includes('delivery_zones_single_fallback')) {
            throw new Error('single_fallback')
        }
        throw error
    }
}

// ------------------------------------------------------------------- roles
export async function setUserRole(userId, role) {
    const { error } = await db().rpc('admin_set_user_role', { p_user_id: userId, p_role: role })
    if (error) throw error
}