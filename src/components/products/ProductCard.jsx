import { Link } from 'react-router-dom'
import PriceTag from './PriceTag.jsx'
import { productImageUrl } from '@/lib/storageUrls'
import { sortImages } from '@/utils/images'
import { hasSale, isNew, isSoldOut } from '@/utils/pricing'

function getBadges(product) {
  const badges = []
  if (isSoldOut(product)) badges.push('Sold out')
  if (hasSale(product)) badges.push('Sale')
  if (isNew(product)) badges.push('New')
  if (product.is_featured) badges.push('Featured')
  return badges.slice(0, 2)
}

export default function ProductCard({ product }) {
  const [primary, secondary] = sortImages(product.images)
  const soldOut = isSoldOut(product)

  return (
    <article className="group">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-blush">
          <img
            src={productImageUrl(primary?.storage_path)}
            alt={primary?.alt_text || product.name}
            loading="lazy"
            className={`h-full w-full object-cover ${soldOut ? 'opacity-70' : ''}`}
          />
          {secondary && (
            <img
              src={productImageUrl(secondary.storage_path)}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
            />
          )}
          <ul className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {getBadges(product).map((b) => (
              <li key={b} className="bg-cream px-2 py-0.5 text-xs font-medium text-maroon">{b}</li>
            ))}
          </ul>
        </div>
        <h3 className="mt-3 font-display text-xl text-ink">{product.name}</h3>
        <PriceTag product={product} className="mt-1 text-sm" />
      </Link>
    </article>
  )
}