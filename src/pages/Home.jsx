import { Link } from 'react-router-dom'
import CollectionCard from '@/components/products/CollectionCard.jsx'
import ProductGrid from '@/components/products/ProductGrid.jsx'
import { LoadingGrid } from '@/components/common/States.jsx'
import CraftBackdrop from '@/features/home/CraftBackdrop.jsx'
import HeroSlider, { DEFAULT_SLIDES } from '@/features/home/HeroSlider.jsx'
import StoryBand from '@/features/home/StoryBand.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { homeBannerUrl } from '@/lib/storageUrls'
import { getCategories, getCollections, getFeaturedProducts, getHomeBanners } from '@/services/catalogService'
import { toSlides } from '@/utils/banners'

export default function Home() {
  useDocumentTitle()
  const banners = useAsync(getHomeBanners, [])
  const collections = useAsync(getCollections, [])
  const featured = useAsync(() => getFeaturedProducts(8), [])
  const categories = useAsync(getCategories, [])

  // Wait for the banners so the slideshow doesn't flash the default slides first.
  // If they fail to load, fall back to the defaults.
  const slides = banners.loading && !banners.data
    ? null
    : banners.data?.length ? toSlides(banners.data, homeBannerUrl) : DEFAULT_SLIDES

  return (
    <div className="relative">
      <CraftBackdrop />

      <div className="relative z-10">
        <h1 className="sr-only">Callista Brio: handcrafted jewelry and accessories</h1>

        <div className="p-3 sm:p-4">
          {slides ? <HeroSlider slides={slides} /> : (
            <div aria-hidden="true" className="shimmer h-[26rem] rounded-2xl lg:h-[30rem]" />
          )}
        </div>

        {collections.data?.length > 0 && (
          <section className="container-page py-12">
            <h2 className="text-3xl text-maroon sm:text-4xl">Our drops</h2>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {collections.data.map((c) => <li key={c.id}><CollectionCard collection={c} /></li>)}
            </ul>
          </section>
        )}

        <section className="container-page py-12">
          <div className="flex items-end justify-between">
            <h2 className="text-3xl text-maroon sm:text-4xl">Featured pieces</h2>
            <Link to="/shop" className="text-sm underline">View all</Link>
          </div>
          <div className="mt-6">
            {featured.loading && !featured.data ? <LoadingGrid count={4} />
              : featured.data?.length ? <ProductGrid products={featured.data} />
                : <p>New pieces are on their way.</p>}
          </div>
        </section>

        {categories.data?.length > 0 && (
          <section className="container-page py-6">
            <div className="rounded-3xl bg-blush/70 p-6 shadow-float sm:p-8">
              <h2 className="text-3xl text-maroon">Shop by style</h2>
              <ul className="mt-5 flex flex-wrap gap-3">
                {categories.data.map((c) => (
                  <li key={c.id}>
                    <Link to={`/shop?category=${c.slug}`}
                      className="inline-block rounded-full border border-maroon bg-cream px-5 py-2 text-maroon transition duration-200 hover:-translate-y-0.5 hover:bg-maroon hover:text-ink-light hover:shadow-float">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <div className="container-page py-12">
          <StoryBand />
        </div>
      </div>
    </div>
  )
}