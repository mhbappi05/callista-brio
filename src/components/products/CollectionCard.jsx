import { Link } from 'react-router-dom'
import { bannerImageUrl } from '@/lib/storageUrls'

export default function CollectionCard({ collection }) {
  const banner = bannerImageUrl(collection.banner_path)
  return (
    <Link
      to={`/shop?collection=${collection.slug}`}
      className="group relative flex aspect-[4/3] items-end overflow-hidden bg-blush"
    >
      {banner && (
        <img src={banner} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      )}
      <span className={`relative m-3 px-4 py-2 font-display text-2xl ${banner ? 'bg-cream text-maroon' : 'text-maroon'}`}>
        {collection.name}
      </span>
    </Link>
  )
}