import { useAsync } from '@/hooks/useAsync'
import { getDeliveryZones } from '@/services/catalogService'
import { formatBDT } from '@/utils/currency'

export default function FreeDeliveryProgress({ subtotal }) {
  const { data: zones } = useAsync(getDeliveryZones, [])
  const thresholds = (zones ?? []).map((z) => Number(z.free_delivery_threshold)).filter((t) => t > 0)
  if (!thresholds.length) return null

  const target = Math.min(...thresholds)
  const remaining = Math.max(0, target - subtotal)
  const pct = Math.min(100, Math.round((subtotal / target) * 100))

  return (
    <div className="mt-4 text-sm">
      <p>
        {remaining > 0
          ? `Add ${formatBDT(remaining)} more for free delivery in eligible areas.`
          : 'You qualify for free delivery in eligible areas.'}
      </p>
      <div
        role="progressbar"
        aria-label="Progress to free delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-2 h-2 w-full bg-blush"
      >
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}