import { useCallback, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, Minus, Plus, Star } from 'lucide-react'
import PriceTag from '@/components/products/PriceTag.jsx'
import ProductGrid from '@/components/products/ProductGrid.jsx'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { placeholderImage, productImageUrl, reviewImageUrl } from '@/lib/storageUrls'
import {
  getDeliveryZones, getProductBySlug, getProductReviews, getRelatedProducts, getReviewStats,
} from '@/services/catalogService'
import { formatBDT } from '@/utils/currency'
import { sortImages } from '@/utils/images'
import { getAvailableStock, isLowStock } from '@/utils/pricing'
import { useCart } from '@/context/CartContext'
import { useWishlist } from '@/context/WishlistContext'
import { usePageMeta } from '@/hooks/usePageMeta'
import { siteUrl } from '@/lib/site'
import { productMeta } from '@/utils/seo'
import { flyToCart } from '@/lib/flyToCart'
import ImageLightbox from '@/components/common/ImageLightbox.jsx'


const MAX_QTY = 20

export default function ProductDetails() {
  const { slug } = useParams()
  const { data: product, error, loading, reload } = useAsync(() => getProductBySlug(slug), [slug])
  const meta = product
    ? productMeta(product, {
      siteUrl: siteUrl(),
      imageUrls: sortImages(product.images).filter((i) => i.storage_path).map((i) => productImageUrl(i.storage_path)),
    })
    : { title: loading ? 'Loading…' : 'Product not found', noindex: !loading }
  usePageMeta(meta)

  if (error) return <div className="container-page"><ErrorState error={error} onRetry={reload} /></div>
  if (loading && !product) return <div className="container-page py-16" aria-busy="true">Loading…</div>
  if (!product) {
    return (
      <div className="container-page">
        <EmptyState title="We couldn’t find that piece"
          message="It may have been removed or renamed."
          action={<Link to="/shop" className="btn-primary">Back to shop</Link>} />
      </div>
    )
  }
  return <ProductView key={product.id} product={product} />
}

function ProductView({ product }) {
  const cart = useCart()
  const wishlist = useWishlist()
  const navigate = useNavigate()
  const saved = wishlist.has(product.id)
  const variants = (product.variants ?? []).filter((v) => v.is_active)
  const firstAvailable = variants.find((v) => v.stock_quantity > 0) ?? variants[0] ?? null
  const [variant, setVariant] = useState(product.has_variants ? firstAvailable : null)
  const [qty, setQty] = useState(1)
  const [notice, setNotice] = useState('')

  const stock = getAvailableStock(product, variant)
  const maxQty = Math.max(1, Math.min(stock, MAX_QTY))
  const soldOut = stock <= 0
  const images = sortImages(product.images)

  function stockMessage() {
    if (soldOut) return 'Sold out'
    if (isLowStock(product, variant)) return `Only ${stock} left`
    return 'In stock'
  }

  async function handleAddToCart() {
    if (product.has_variants && !variant) {
      setNotice('Please choose an option first.')
      return
    }
    const added = cart.addItem({ productId: product.id, variantId: variant?.id ?? null, quantity: qty })
    if (!added) return
    setNotice('')
    const img = document.querySelector('[data-fly-source]')
    await flyToCart({ from: img, src: img?.currentSrc || img?.src })
    cart.openCart()
  }

  async function handleWishlist() {
    const result = await wishlist.toggle(product.id)
    if (result === 'auth_required') {
      navigate(`/auth?next=${encodeURIComponent(`/product/${product.slug}`)}`)
    } else if (result === 'error') {
      setNotice('We couldn’t update your wishlist. Please try again.')
    }
  }

  return (
    <article className="container-page py-10">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm">
        <Link to="/shop" className="underline">Shop</Link>
        {product.category && (
          <> / <Link to={`/shop?category=${product.category.slug}`} className="underline">{product.category.name}</Link></>
        )}
      </nav>

      <div className="grid gap-10 md:grid-cols-2">
        <Gallery images={images} name={product.name} />

        <div>
          <h1 className="text-4xl text-maroon">{product.name}</h1>
          {product.sku && !product.has_variants && <p className="mt-1 text-sm opacity-70">SKU {product.sku}</p>}
          <PriceTag product={product} variant={variant} className="mt-3 text-2xl" />
          <RatingSummary productId={product.id} />

          {product.description && <p className="mt-5 max-w-prose whitespace-pre-line">{product.description}</p>}

          {product.has_variants && variants.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-medium">Option</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {variants.map((v) => {
                  const out = v.stock_quantity <= 0
                  const selected = variant?.id === v.id
                  return (
                    <button key={v.id} type="button" disabled={out} aria-pressed={selected}
                      onClick={() => { setVariant(v); setQty(1) }}
                      className={`border px-4 py-2 text-sm ${selected ? 'border-maroon bg-maroon text-ink-light' : 'border-maroon/40'} ${out ? 'line-through opacity-50' : ''}`}>
                      {v.name}{out && <span className="sr-only"> (sold out)</span>}
                    </button>
                  )
                })}
              </div>
            </fieldset>
          )}

          <p className={`mt-5 text-sm font-medium ${soldOut ? 'text-maroon' : ''}`} aria-live="polite">
            {stockMessage()}
          </p>

          <div className="mt-4 flex items-center gap-3">
            <div className="flex items-center border border-maroon/40" role="group" aria-label="Quantity">
              <button type="button" className="btn-primary flex-1 disabled:opacity-50"
                disabled={soldOut || !cart.ready} onClick={handleAddToCart}>
                {soldOut ? 'Sold out' : 'Add to cart'}
              </button>
              <span className="w-10 text-center" aria-live="polite">{qty}</span>
              <button type="button" className="border border-maroon/40 p-3"
                aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'} aria-pressed={saved}
                onClick={handleWishlist}>
                <Heart size={20} fill={saved ? 'currentColor' : 'none'} />
              </button>
            </div>
            {/* <button type="button" className="btn-primary flex-1 disabled:opacity-50"
              disabled={soldOut} onClick={handleAddToCart}>
              {soldOut ? 'Sold out' : 'Add to cart'}
            </button>
            <button type="button" className="border border-maroon/40 p-3" aria-label="Add to wishlist"
              onClick={handleWishlist}>
              <Heart size={20} />
            </button> */}
          </div>
          {notice && <p role="status" className="mt-3 text-sm">{notice}</p>}

          <Details product={product} />
          <Delivery />
        </div>
      </div>

      {product.story && (
        <section className="mt-14 max-w-prose">
          <h2 className="text-3xl text-maroon">The story</h2>
          <p className="mt-3 whitespace-pre-line">{product.story}</p>
        </section>
      )}

      <Reviews productId={product.id} />
      <Related product={product} />
    </article>
  )
}

function Gallery({ images, name }) {
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)
  const [origin, setOrigin] = useState('50% 50%')
  const list = images.length ? images : [{ id: 'placeholder', storage_path: null, alt_text: name }]
  const current = list[Math.min(index, list.length - 1)]
  const src = current.storage_path ? productImageUrl(current.storage_path) : placeholderImage

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect()
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`)
  }

  return (
    <div>
      <button type="button" aria-label={zoom ? 'Zoom out' : 'Zoom in'}
        onClick={() => setZoom((z) => !z)} onMouseMove={zoom ? onMove : undefined}
        onMouseLeave={() => setZoom(false)}
        className={`block aspect-square w-full overflow-hidden bg-blush ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}>
        <img src={src} alt={current.alt_text || name} data-fly-source fetchpriority="high" decoding="async"
          className="h-full w-full object-cover transition-transform duration-200"
          style={{ transform: zoom ? 'scale(2)' : 'scale(1)', transformOrigin: origin }} />
      </button>
      {list.length > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((img, i) => (
            <li key={img.id}>
              <button type="button" aria-label={`Show image ${i + 1} of ${list.length}`}
                aria-current={i === index} onClick={() => setIndex(i)}
                className={`block h-16 w-16 overflow-hidden border-2 ${i === index ? 'border-maroon' : 'border-transparent'}`}>
                <img src={productImageUrl(img.storage_path)} alt="" className="h-full w-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Details({ product }) {
  const rows = [
    ['Material', product.material],
    ['Color', product.color],
    ['Dimensions', product.dimensions],
    ['Weight', product.weight_grams ? `${product.weight_grams} g` : null],
    ['Care', product.care_instructions],
  ].filter(([, v]) => v)
  if (!rows.length) return null
  return (
    <section className="mt-8 border-t border-maroon/20 pt-6">
      <h2 className="text-2xl text-maroon">Details</h2>
      <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
        {rows.map(([k, v]) => (<div key={k} className="contents"><dt className="font-medium">{k}</dt><dd>{v}</dd></div>))}
      </dl>
    </section>
  )
}

// Fees come from the delivery_zones table (owner-configured). Nothing is hard-coded.
function Delivery() {
  const { data: zones } = useAsync(getDeliveryZones, [])
  return (
    <section className="mt-6 border-t border-maroon/20 pt-6">
      <h2 className="text-2xl text-maroon">Delivery</h2>
      {zones?.length ? (
        <ul className="mt-3 space-y-1 text-sm">
          {zones.map((z) => (
            <li key={z.code}>
              {z.name}: {formatBDT(z.fee)}
              {z.free_delivery_threshold && ` (free over ${formatBDT(z.free_delivery_threshold)})`}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm">Delivery charges are shown at checkout.</p>
      )}
    </section>
  )
}

function Stars({ value }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={16} className="text-gold" fill={n <= Math.round(value) ? 'currentColor' : 'none'} />
      ))}
    </span>
  )
}

function RatingSummary({ productId }) {
  const { data } = useAsync(() => getReviewStats(productId), [productId])
  if (!data?.review_count) return null
  return (
    <p className="mt-2 flex items-center gap-2 text-sm">
      <Stars value={Number(data.average_rating)} />
      {Number(data.average_rating).toFixed(1)} ({data.review_count})
    </p>
  )
}

function Reviews({ productId }) {
  const { data: reviews } = useAsync(() => getProductReviews(productId), [productId])
  const [zoom, setZoom] = useState(null)
  const closeZoom = useCallback(() => setZoom(null), [])

  if (!reviews?.length) return null
  return (
    <section className="mt-14">
      <h2 className="text-3xl text-maroon">Reviews</h2>
      <ul className="mt-4 space-y-6">
        {reviews.map((r) => (
          <li key={r.id} className="max-w-prose">
            <Stars value={r.rating} />
            {r.title && <p className="mt-1 font-medium">{r.title}</p>}
            {r.comment && <p className="mt-1">{r.comment}</p>}
            {r.images?.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {r.images.map((img) => {
                  const url = reviewImageUrl(img.storage_path)
                  return (
                    <li key={img.id}>
                      <button type="button" onClick={() => setZoom(url)} aria-label="View customer photo larger"
                        className="block overflow-hidden rounded-xl shadow-float transition hover:-translate-y-0.5">
                        <img src={url} alt="" loading="lazy" className="h-20 w-20 object-cover" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
            <p className="mt-1 text-xs opacity-70">
              {r.is_verified_purchase && 'Verified purchase · '}
              {new Date(r.created_at).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', dateStyle: 'medium' })}
            </p>
          </li>
        ))}
      </ul>
      <ImageLightbox src={zoom} alt="Customer photo" onClose={closeZoom} />
    </section>
  )
}

function Related({ product }) {
  const { data } = useAsync(() => getRelatedProducts(product), [product.id])
  if (!data?.length) return null
  return (
    <section className="mt-14">
      <h2 className="text-3xl text-maroon">You may also like</h2>
      <div className="mt-6"><ProductGrid products={data} /></div>
    </section>
  )
}