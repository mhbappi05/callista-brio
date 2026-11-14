import { Link } from 'react-router-dom'
import CollectionCard from '@/components/products/CollectionCard.jsx'
import ProductGrid from '@/components/products/ProductGrid.jsx'
import { LoadingGrid } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getCategories, getCollections, getFeaturedProducts } from '@/services/catalogService'

export default function Home() {
  useDocumentTitle()
  const collections = useAsync(getCollections, [])
  const featured = useAsync(() => getFeaturedProducts(8), [])
  const categories = useAsync(getCategories, [])

  return (
    <>
      <section className="bg-blush">
        <div className="container-page py-20 sm:py-28">
          <h1 className="max-w-2xl text-5xl text-maroon sm:text-6xl">
            Handcrafted pieces for the woman who shines
          </h1>
          <p className="mt-4 max-w-prose">
            Jhumkas, studs, hoops and hand-painted statement pieces, made by hand and delivered across Bangladesh.
          </p>
          <Link to="/shop" className="btn-primary mt-8">Shop the collection</Link>
        </div>
      </section>

      {collections.data?.length > 0 && (
        <section className="container-page py-14">
          <h2 className="text-3xl text-maroon">Our drops</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {collections.data.map((c) => <li key={c.id}><CollectionCard collection={c} /></li>)}
          </ul>
        </section>
      )}

      <section className="container-page py-14">
        <div className="flex items-end justify-between">
          <h2 className="text-3xl text-maroon">Featured pieces</h2>
          <Link to="/shop" className="text-sm underline">View all</Link>
        </div>
        <div className="mt-6">
          {featured.loading && !featured.data ? <LoadingGrid count={4} />
            : featured.data?.length ? <ProductGrid products={featured.data} />
            : <p>New pieces are on their way.</p>}
        </div>
      </section>

      {categories.data?.length > 0 && (
        <section className="bg-blush py-12">
          <div className="container-page">
            <h2 className="text-3xl text-maroon">Shop by style</h2>
            <ul className="mt-5 flex flex-wrap gap-3">
              {categories.data.map((c) => (
                <li key={c.id}>
                  <Link to={`/shop?category=${c.slug}`}
                    className="inline-block border border-maroon px-5 py-2 text-maroon hover:bg-maroon hover:text-ink-light">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="container-page py-16">
        <h2 className="max-w-xl text-3xl text-maroon">Made by hand, one piece at a time</h2>
        <p className="mt-4 max-w-prose">
          {/* Replace with the owner's own brand story. */}
          Every Callista Brio piece is shaped, painted and finished by hand, so no two are exactly alike.
        </p>
        <Link to="/about" className="mt-4 inline-block underline">Read our story</Link>
      </section>
    </>
  )
}