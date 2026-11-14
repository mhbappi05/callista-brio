import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useCart } from '@/context/CartContext'
import { productImageUrl } from '@/lib/storageUrls'
import { formatBDT } from '@/utils/currency'
import { sortImages } from '@/utils/images'

export default function CartLineItem({ item, compact = false }) {
  const { updateQuantity, removeItem } = useCart()
  const { product, variant, status } = item

  if (status === 'loading') {
    return <li className="animate-pulse py-4"><div className="h-16 bg-blush" /></li>
  }

  const gone = status === 'unavailable' || status === 'sold_out'
  const image = product ? sortImages(product.images)[0] : null
  const size = compact ? 'h-16 w-16' : 'h-24 w-24'
  const qty = gone ? item.quantity : item.effectiveQuantity

  return (
    <li className="flex gap-4 border-b border-maroon/15 py-4">
      <div className={`${size} shrink-0 overflow-hidden bg-blush`}>
        {product && (
          <img src={productImageUrl(image?.storage_path)} alt={image?.alt_text || product.name}
            className={`h-full w-full object-cover ${gone ? 'opacity-50' : ''}`} />
        )}
      </div>

      <div className="min-w-0 flex-1">
        {product ? (
          <Link to={`/product/${product.slug}`} className="font-display text-lg leading-tight">
            {product.name}
          </Link>
        ) : (
          <p className="font-display text-lg">Item no longer available</p>
        )}
        {variant && <p className="text-sm opacity-70">{variant.name}</p>}

        {status === 'unavailable' && <p role="status" className="mt-1 text-sm text-maroon">This item is no longer available.</p>}
        {status === 'sold_out' && <p role="status" className="mt-1 text-sm text-maroon">Sold out.</p>}
        {status === 'limited' && (
          <p role="status" className="mt-1 text-sm text-maroon">Only {item.stock} available, so the quantity was adjusted.</p>
        )}

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {!gone ? (
            <div className="flex items-center border border-maroon/40" role="group" aria-label={`Quantity for ${product.name}`}>
              <button type="button" className="p-2" aria-label="Decrease quantity"
                onClick={() => updateQuantity(item.key, qty - 1)}>
                <Minus size={14} />
              </button>
              <span className="w-8 text-center text-sm" aria-live="polite">{qty}</span>
              <button type="button" className="p-2" aria-label="Increase quantity"
                disabled={qty >= item.stock}
                onClick={() => updateQuantity(item.key, qty + 1)}>
                <Plus size={14} />
              </button>
            </div>
          ) : <span />}

          <div className="flex items-center gap-3">
            {!gone && (
              <span className="text-sm font-semibold text-maroon">{formatBDT(item.lineTotal)}</span>
            )}
            <button type="button" className="p-2" onClick={() => removeItem(item.key)}
              aria-label={`Remove ${product?.name ?? 'item'} from cart`}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        {!gone && !compact && <p className="mt-1 text-xs opacity-70">{formatBDT(item.unitPrice)} each</p>}
      </div>
    </li>
  )
}