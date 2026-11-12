// Text will be controlled from the admin panel (store_settings) in a later phase.
export default function AnnouncementBar({ message = 'Handcrafted in Bangladesh. Delivered nationwide.' }) {
  if (!message) return null
  return (
    <div className="bg-blush py-2 text-center text-sm text-ink">
      <p className="container-page">{message}</p>
    </div>
  )
}
