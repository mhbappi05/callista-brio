import { supabase } from '@/lib/supabaseClient'
import { CARD_SELECT } from './catalogService'

function db() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}

export async function getWishlistIds(userId) {
  const { data, error } = await db().from('wishlists').select('product_id').eq('user_id', userId)
  if (error) throw error
  return data.map((r) => r.product_id)
}

export async function getWishlistProducts(userId) {
  const { data, error } = await db()
    .from('wishlists')
    .select(`created_at, product:products(${CARD_SELECT})`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  // RLS hides inactive products, which come back as null.
  return data.map((r) => r.product).filter(Boolean)
}

export async function addToWishlist(userId, productId) {
  const { error } = await db().from('wishlists').insert({ user_id: userId, product_id: productId })
  if (error && error.code !== '23505') throw error // 23505 = already saved
}

export async function removeFromWishlist(userId, productId) {
  const { error } = await db().from('wishlists').delete().eq('user_id', userId).eq('product_id', productId)
  if (error) throw error
}