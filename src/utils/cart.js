import { getAvailableStock, getEffectivePrice } from './pricing.js'

export const MAX_QTY = 20

export const lineKey = (line) => `${line.productId}:${line.variantId ?? ''}`

export function clampQty(n) {
  const v = Math.floor(Number(n))
  if (!Number.isFinite(v) || v < 1) return 1
  return Math.min(MAX_QTY, v)
}

const round2 = (n) => Math.round(n * 100) / 100

// Combines two line lists, summing quantities of identical lines (capped at MAX_QTY).
export function mergeLines(a, b) {
  const map = new Map()
  for (const line of [...a, ...b]) {
    const key = lineKey(line)
    const prev = map.get(key)
    map.set(key, {
      productId: line.productId,
      variantId: line.variantId ?? null,
      quantity: clampQty((prev?.quantity ?? 0) + line.quantity),
    })
  }
  return [...map.values()]
}

// Joins raw cart lines with live product data. Status:
// loading | unavailable | sold_out | limited (quantity above stock) | ok
export function enrichLines(lines, products, { pending = false } = {}) {
  const byId = new Map(products.map((p) => [p.id, p]))

  return lines.map((line) => {
    const base = {
      ...line,
      key: lineKey(line),
      product: null,
      variant: null,
      unitPrice: 0,
      stock: 0,
      effectiveQuantity: 0,
      lineTotal: 0,
    }
    const product = byId.get(line.productId)
    if (!product) return { ...base, status: pending ? 'loading' : 'unavailable' }

    let variant = null
    if (product.has_variants) {
      variant = (product.variants ?? []).find((v) => v.id === line.variantId && v.is_active) ?? null
      if (!variant) return { ...base, product, status: 'unavailable' }
    } else if (line.variantId) {
      return { ...base, product, status: 'unavailable' }
    }

    const stock = getAvailableStock(product, variant)
    const unitPrice = getEffectivePrice(product, variant)
    if (stock <= 0) return { ...base, product, variant, unitPrice, status: 'sold_out' }

    const effectiveQuantity = Math.min(line.quantity, stock, MAX_QTY)
    return {
      ...base,
      product,
      variant,
      unitPrice,
      stock,
      effectiveQuantity,
      lineTotal: round2(unitPrice * effectiveQuantity),
      status: effectiveQuantity < line.quantity ? 'limited' : 'ok',
    }
  })
}

const purchasable = (item) => item.status === 'ok' || item.status === 'limited'

export const subtotalOf = (items) =>
  round2(items.filter(purchasable).reduce((sum, i) => sum + i.lineTotal, 0))

export const hasPurchasable = (items) => items.some(purchasable)

export const countItems = (lines) => lines.reduce((sum, l) => sum + l.quantity, 0)