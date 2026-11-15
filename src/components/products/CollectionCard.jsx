import { Link } from 'react-router-dom'
import { bannerImageUrl } from '@/lib/storageUrls'

export default function CollectionCard({ collection }) {
  const banner = bannerImageUrl(collection.banner_path)
  return (
    <Link
      to={`/shop?collection=${collection.slug}`}
      className="group float-lift relative flex aspect-[4/3] items-end overflow-hidden rounded-2xl bg-blush shadow-float"
    >
      {banner && (
        <img src={banner} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      )}
      <span className={`relative m-3 px-4 py-2 font-display text-2xl ${banner ? 'bg-cream text-maroon' : 'text-maroon'}`}>
        {collection.name}
      </span>
    </Link>
  )
}