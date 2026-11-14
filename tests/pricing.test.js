import { describe, it, expect } from 'vitest'
import { getAvailableStock, getEffectivePrice, hasSale, isLowStock, isSoldOut } from '../src/utils/pricing.js'

const simple = { price: 1000, discount_price: 800, has_variants: false, stock_quantity: 2, low_stock_threshold: 3 }
const withVariants = {
  price: 1000, discount_price: null, has_variants: true, stock_quantity: 0, low_stock_threshold: 3,
  variants: [{ stock_quantity: 0, is_active: true }, { stock_quantity: 5, is_active: true }, { stock_quantity: 9, is_active: false }],
}

describe('pricing', () => {
  it('uses the discount price when present', () => {
    expect(getEffectivePrice(simple)).toBe(800)
    expect(hasSale(simple)).toBe(true)
  })
  it('variant price override beats discount and removes the sale flag', () => {
    expect(getEffectivePrice(simple, { price: 900 })).toBe(900)
    expect(hasSale(simple, { price: 900 })).toBe(false)
  })
  it('ignores product-level stock when the product has variants', () => {
    expect(getAvailableStock(withVariants)).toBe(5)
    expect(isSoldOut(withVariants)).toBe(false)
  })
  it('flags low stock', () => expect(isLowStock(simple)).toBe(true))
})