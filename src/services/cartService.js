import { supabase } from '@/lib/supabaseClient'

function db() {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED')
  return supabase
}

export async function getOrCreateCartId(userId) {
  const found = await db().from('carts').select('id').eq('user_id', userId).maybeSingle()
  if (found.error) throw found.error
  if (found.data) return found.data.id

  const created = await db().from('carts').insert({ user_id: userId }).select('id').single()
  if (created.error) {
    // Another tab may have created it first.
    const retry = await db().from('carts').select('id').eq('user_id', userId).maybeSingle()
    if (retry.data) return retry.data.id
    throw created.error
  }
  return created.data.id
}

export async function fetchServerLines(cartId) {
  const { data, error } = await db()
    .from('cart_items')
    .select('product_id, variant_id, quantity')
    .eq('cart_id', cartId)
    .order('created_at')
  if (error) throw error
  return data.map((r) => ({ productId: r.product_id, variantId: r.variant_id, quantity: r.quantity }))
}

async function findLineId(cartId, line) {
  let q = db().from('cart_items').select('id').eq('cart_id', cartId).eq('product_id', line.productId)
  q = line.variantId ? q.eq('variant_id', line.variantId) : q.is('variant_id', null)
  const { data, error } = await q.maybeSingle()
  if (error) throw error
  return data?.id ?? null
}

export async function setServerLine(cartId, line) {
  const id = await findLineId(cartId, line)
  if (id) {
    const { error } = await db().from('cart_items').update({ quantity: line.quantity }).eq('id', id)
    if (error) throw error
  } else {
    const { error } = await db().from('cart_items').insert({
      cart_id: cartId,
      product_id: line.productId,
      variant_id: line.variantId ?? null,
      quantity: line.quantity,
    })
    if (error) throw error
  }
}

export async function removeServerLine(cartId, line) {
  const id = await findLineId(cartId, line)
  if (!id) return
  const { error } = await db().from('cart_items').delete().eq('id', id)
  if (error) throw error
}

export async function clearServerCart(cartId) {
  const { error } = await db().from('cart_items').delete().eq('cart_id', cartId)
  if (error) throw error
}