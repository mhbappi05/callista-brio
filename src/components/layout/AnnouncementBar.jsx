import { useAsync } from '@/hooks/useAsync'
import { getPublicSetting } from '@/services/catalogService'

export default function AnnouncementBar() {
  const { data } = useAsync(() => getPublicSetting('announcement'), [])
  if (!data?.enabled || !data?.text) return null
  return (
    <div className="bg-blush py-2 text-center text-sm text-ink">
      <p className="container-page">{data.text}</p>
    </div>
  )
}