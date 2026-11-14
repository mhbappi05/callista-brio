import { describe, it, expect } from 'vitest'
import { clampQty, countItems, enrichLines, hasPurchasable, mergeLines, subtotalOf } from '../src/utils/cart.js'

const simple = { id: 'p1', price: 1000, discount_price: 800, has_variants: false, stock_quantity: 3, variants: [] }
const withVar = {
  id: 'p2', price: 500, discount_price: null, has_variants: true, stock_quantity: 0,
  variants: [
    { id: 'v1', price: null, stock_quantity: 4, is_active: true },
    { id: 'v2', price: 450, stock_quantity: 0, is_active: true },
  ],
}

describe('cart utils', () => {
  it('clamps quantity to 1..20', () => {
    expect(clampQty(0)).toBe(1)
    expect(clampQty(99)).toBe(20)
    expect(clampQty('3')).toBe(3)
  })

  it('merges identical lines and caps at 20', () => {
    const merged = mergeLines(
      [{ productId: 'p1', variantId: null, quantity: 15 }],
      [{ productId: 'p1', variantId: null, quantity: 9 }, { productId: 'p2', variantId: 'v1', quantity: 1 }]
    )
    expect(merged).toHaveLength(2)
    expect(merged[0].quantity).toBe(20)
  })

  it('prices lines with the discount price', () => {
    const [item] = enrichLines([{ productId: 'p1', variantId: null, quantity: 2 }], [simple])
    expect(item.status).toBe('ok')
    expect(item.lineTotal).toBe(1600)
  })

  it('limits quantity to available stock', () => {
    const [item] = enrichLines([{ productId: 'p1', variantId: null, quantity: 5 }], [simple])
    expect(item.status).toBe('limited')
    expect(item.effectiveQuantity).toBe(3)
    expect(item.lineTotal).toBe(2400)
  })

  it('handles variants: ok, sold out, missing, invalid', () => {
    const items = enrichLines([
      { productId: 'p2', variantId: 'v1', quantity: 1 },
      { productId: 'p2', variantId: 'v2', quantity: 1 },
      { productId: 'p2', variantId: null, quantity: 1 },
      { productId: 'p2', variantId: 'nope', quantity: 1 },
    ], [withVar])
    expect(items.map((i) => i.status)).toEqual(['ok', 'sold_out', 'unavailable', 'unavailable'])
  })

  it('distinguishes loading from unavailable', () => {
    const lines = [{ productId: 'gone', variantId: null, quantity: 1 }]
    expect(enrichLines(lines, [])[0].status).toBe('unavailable')
    expect(enrichLines(lines, [], { pending: true })[0].status).toBe('loading')
  })

  it('subtotal ignores unavailable and sold-out lines', () => {
    const items = enrichLines([
      { productId: 'p1', variantId: null, quantity: 1 },
      { productId: 'p2', variantId: 'v2', quantity: 1 },
      { productId: 'x', variantId: null, quantity: 1 },
    ], [simple, withVar])
    expect(subtotalOf(items)).toBe(800)
    expect(hasPurchasable(items)).toBe(true)
    expect(countItems([{ quantity: 2 }, { quantity: 3 }])).toBe(5)
  })
})