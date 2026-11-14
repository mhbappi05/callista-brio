import { supabase } from '@/lib/supabaseClient'

function db() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}

export const MAX_ADDRESSES = 10

export async function listAddresses(userId) {
  const { data, error } = await db()
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createAddress(userId, values) {
  const { error } = await db().from('addresses').insert({ ...values, user_id: userId })
  if (error) throw error
}

export async function updateAddress(id, values) {
  const { error } = await db().from('addresses').update(values).eq('id', id)
  if (error) throw error
}

export async function deleteAddress(id) {
  const { error } = await db().from('addresses').delete().eq('id', id)
  if (error) throw error
}