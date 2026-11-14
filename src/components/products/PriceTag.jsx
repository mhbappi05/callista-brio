import { formatBDT } from '@/utils/currency'
import { getEffectivePrice, hasSale } from '@/utils/pricing'

export default function PriceTag({ product, variant, className = '' }) {
  const price = getEffectivePrice(product, variant)
  const onSale = hasSale(product, variant)
  return (
    <p className={className}>
      <span className="font-semibold text-maroon">{formatBDT(price)}</span>
      {onSale && (
        <>
          <span className="ml-2 text-sm line-through opacity-60" aria-hidden="true">
            {formatBDT(product.price)}
          </span>
          <span className="sr-only"> Sale price. Original price {formatBDT(product.price)}.</span>
        </>
      )}
    </p>
  )
}