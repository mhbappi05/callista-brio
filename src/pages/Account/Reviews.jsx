import { Link, useLocation } from 'react-router-dom'
import { ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listMyReviews, listReviewableItems } from '@/services/accountService'
import { formatDhakaDate } from '@/utils/orderLabels'
import { reviewImageUrl } from '@/lib/storageUrls'

const STATUS = { pending: 'Awaiting moderation', approved: 'Published', rejected: 'Not published' }

export default function Reviews() {
    useDocumentTitle('My reviews')
    const { user } = useAuth()
    const waiting = useAsync(() => listReviewableItems(user.id), [user.id])
    const mine = useAsync(() => listMyReviews(user.id), [user.id])
    const flash = useLocation().state?.flash

    if (waiting.error || mine.error) {
        return <ErrorState error={waiting.error || mine.error} onRetry={() => { waiting.reload(); mine.reload() }} />
    }

    return (
        <section className="space-y-8">
            {flash && <p role="status" className="rounded-xl bg-blush p-3 text-sm">{flash}</p>}
            <div>
                <h2 className="text-3xl text-maroon">Waiting for your review</h2>
                {!waiting.data ? <p className="mt-3" aria-busy="true">Loading…</p>
                    : !waiting.data.length ? <p className="mt-3 text-sm">Nothing to review right now. Delivered items you haven’t reviewed show up here.</p>
                        : (
                            <ul className="mt-3 divide-y divide-maroon/15 float-card">
                                {waiting.data.map((i) => (
                                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                                        <span>{i.product_name}{i.variant_description ? ` (${i.variant_description})` : ''}
                                            <span className="block opacity-70">Order {i.order.order_number}</span></span>
                                        <Link to={`/account/reviews/new?item=${i.id}`} className="btn-secondary !px-4 !py-2">Write a review</Link>
                                    </li>
                                ))}
                            </ul>
                        )}
            </div>

            <div>
                <h2 className="text-3xl text-maroon">Your reviews</h2>
                {!mine.data ? <p className="mt-3" aria-busy="true">Loading…</p>
                    : !mine.data.length ? <p className="mt-3 text-sm">You haven’t written any reviews yet.</p>
                        : (
                            <ul className="mt-3 divide-y divide-maroon/15 float-card">
                                {mine.data.map((r) => (
                                    <li key={r.id} className="p-3 text-sm">
                                        <p>
                                            <span role="img" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                                            {' '}{r.product?.name ?? 'A product'} · {STATUS[r.status]} · {formatDhakaDate(r.created_at)}
                                        </p>
                                        {r.title && <p className="font-medium">{r.title}</p>}
                                        {r.comment && <p>{r.comment}</p>}
                                        {r.images?.length > 0 && (
                                            <ul className="mt-2 flex gap-2">
                                                {r.images.map((img) => (
                                                    <li key={img.id}>
                                                        <img src={reviewImageUrl(img.storage_path)} alt="Your photo" loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
            </div>
        </section>
    )
}