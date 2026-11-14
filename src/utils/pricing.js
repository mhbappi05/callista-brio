// Mirrors the rules in the database create_order function:
// variant price override > product discount price > product price.
export function getEffectivePrice(product, variant) {
    if (variant?.price != null) return Number(variant.price)
    return Number(product.discount_price ?? product.price)
  }
  
  export function hasSale(product, variant) {
    return variant?.price == null && product.discount_price != null
  }
  
  export function getAvailableStock(product, variant) {
    if (product.has_variants) {
      if (variant) return variant.is_active === false ? 0 : variant.stock_quantity
      return (product.variants ?? [])
        .filter((v) => v.is_active)
        .reduce((sum, v) => sum + v.stock_quantity, 0)
    }
    return product.stock_quantity
  }
  
  export const isSoldOut = (product, variant) => getAvailableStock(product, variant) <= 0
  
  export function isLowStock(product, variant) {
    const stock = getAvailableStock(product, variant)
    return stock > 0 && stock <= product.low_stock_threshold
  }
  
  export function isNew(product, days = 30) {
    return Date.now() - new Date(product.created_at).getTime() < days * 86_400_000
  }