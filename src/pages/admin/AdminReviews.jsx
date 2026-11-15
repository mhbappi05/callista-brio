import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorLine, PageHeader, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listReviews, moderateReview, deleteReviewImage } from '@/services/adminCatalogService'
import { formatDhakaDate } from '@/utils/orderLabels'
import { reviewImageUrl } from '@/lib/storageUrls'

const TABS = [['pending', 'Awaiting review'], ['approved', 'Approved'], ['rejected', 'Rejected']]

export default function AdminReviews() {
    useDocumentTitle('Reviews (admin)')
    const [tab, setTab] = useState('pending')
    const { data, error, loading, reload } = useAsync(() => listReviews(tab), [tab])
    const action = useAction()

    async function moderate(id, status) {
        const r = await action.run(() => moderateReview(id, status))
        if (r.ok) reload()
    }

    async function removePhoto(img) {
        if (!window.confirm('Remove this photo? The review text is not affected.')) return
        const r = await action.run(() => deleteReviewImage(img))
        if (r.ok) reload()
    }

    return (
        <section>
            <PageHeader title="Reviews" />
            <div className="mt-6 flex gap-2" role="tablist" aria-label="Review status">
                {TABS.map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`px-4 py-2 text-sm ${tab === key ? 'bg-maroon text-ink-light' : 'border border-maroon/40'}`}>{label}</button>
                ))}
            </div>
            <div className="mt-3"><ErrorLine message={action.error} /></div>

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">Nothing here.</p>
                        : (
                            <ul className="mt-4 divide-y divide-maroon/15 float-card">
                                {data.map((r) => (
                                    <li key={r.id} className="space-y-1 p-4 text-sm">
                                        <p>
                                            <span role="img" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>{' '}
                                            on <Link className="underline" to={`/product/${r.product?.slug}`}>{r.product?.name}</Link>
                                            {' '}by {r.reviewer?.full_name || 'a customer'} · {formatDhakaDate(r.created_at)}
                                            {r.is_verified_purchase && ' · verified purchase'}
                                        </p>
                                        {r.title && <p className="font-medium">{r.title}</p>}
                                        {r.comment && <p className="whitespace-pre-line">{r.comment}</p>}
                                        {r.images?.length > 0 && (
                                            <ul className="flex flex-wrap gap-3 pt-1">
                                                {r.images.map((img) => (
                                                    <li key={img.id} className="text-center text-xs">
                                                        <a href={reviewImageUrl(img.storage_path)} target="_blank" rel="noopener noreferrer">
                                                            <img src={reviewImageUrl(img.storage_path)} alt="Customer photo (opens full size)" className="h-20 w-20 rounded-lg object-cover shadow-float" />
                                                        </a>
                                                        <button type="button" className="mt-1 underline" disabled={action.busy} onClick={() => removePhoto(img)}>Remove photo</button>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                            {r.status !== 'approved' && <button type="button" className={`btn-primary ${smallBtn}`} disabled={action.busy} onClick={() => moderate(r.id, 'approved')}>Approve</button>}
                                            {r.status !== 'rejected' && <button type="button" className={`btn-secondary ${smallBtn}`} disabled={action.busy} onClick={() => moderate(r.id, 'rejected')}>Reject</button>}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
        </section>
    )
}