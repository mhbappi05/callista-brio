import { ORDER_STATUS_LABELS, formatDhakaDate } from '@/utils/orderLabels'

const STEPS = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'delivered']

export default function OrderTimeline({ status, history }) {
    const at = new Map(history.map((h) => [h.to_status, h.created_at]))

    if (status === 'cancelled') {
        return (
            <p className="text-sm">
                <strong>Cancelled</strong>
                {at.get('cancelled') && <span className="opacity-70"> · {formatDhakaDate(at.get('cancelled'))}</span>}
            </p>
        )
    }

    const current = STEPS.indexOf(status)
    return (
        <ol className="space-y-3">
            {STEPS.map((s, i) => {
                const done = i <= current
                return (
                    <li key={s} className="flex gap-3" aria-current={i === current ? 'step' : undefined}>
                        <span aria-hidden="true"
                            className={`mt-1 h-3 w-3 shrink-0 rounded-full border ${done ? 'border-maroon bg-maroon' : 'border-maroon/40'}`} />
                        <span className={`text-sm ${done ? '' : 'opacity-50'}`}>
                            {ORDER_STATUS_LABELS[s]}
                            <span className="sr-only">{done ? ' (reached)' : ' (not yet)'}</span>
                            {at.get(s) && <span className="block text-xs opacity-70">{formatDhakaDate(at.get(s))}</span>}
                        </span>
                    </li>
                )
            })}
        </ol>
    )
}