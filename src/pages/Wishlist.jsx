import { Link } from 'react-router-dom'
import ProductCard from '@/components/products/ProductCard.jsx'
import { EmptyState, ErrorState, LoadingGrid } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useWishlist } from '@/context/WishlistContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getWishlistProducts } from '@/services/wishlistService'

export default function Wishlist() {
  useDocumentTitle('Wishlist')
  const { user } = useAuth()
  const { ids, toggle } = useWishlist()
  const { data, error, loading, reload } = useAsync(() => getWishlistProducts(user.id), [user.id])

  // Hide items the moment they are removed, without refetching.
  const products = (data ?? []).filter((p) => ids.has(p.id))

  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">Wishlist</h1>
      <div className="mt-8">
        {error ? <ErrorState error={error} onRetry={reload} />
          : loading && !data ? <LoadingGrid count={4} />
          : products.length === 0 ? (
            <EmptyState title="Nothing saved yet" message="Tap the heart on a piece to save it here."
              action={<Link to="/shop" className="btn-primary">Browse the shop</Link>} />
          ) : (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
              {products.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} />
                  <button type="button" className="mt-2 text-sm underline" onClick={() => toggle(p.id)}>
                    Remove from wishlist
                  </button>
                </li>
              ))}
            </ul>
          )}
      </div>
    </section>
  )
}