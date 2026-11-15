import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { filterImageFiles, fitToLimit } from '@/lib/imageUpload'
import { MAX_REVIEW_PHOTOS, accountErrorMessage, getReviewItem, submitReview } from '@/services/accountService'

const input = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2 text-sm'

export default function ReviewForm() {
    useDocumentTitle('Write a review')
    const [params] = useSearchParams()
    const itemId = params.get('item')
    const { user } = useAuth()
    const { data, error, loading, reload } = useAsync(
        () => (itemId ? getReviewItem(user.id, itemId) : Promise.resolve(null)),
        [user.id, itemId]
    )

    if (error) return <ErrorState error={error} onRetry={reload} />
    if (loading && !data) return <p aria-busy="true">Loading…</p>

    const back = <Link to="/account/reviews" className="btn-primary">My reviews</Link>
    if (!data) return <EmptyState title="Item not found" message="Choose an item from your reviews page." action={back} />
    if (data.order.order_status !== 'delivered') {
        return <EmptyState title="Not available yet" message="You can review a product once the order has been delivered." action={back} />
    }
    if (data.alreadyReviewed) return <EmptyState title="Already reviewed" message="You have already reviewed this item." action={back} />
    return <Form item={data} userId={user.id} />
}

function Form({ item, userId }) {
    const navigate = useNavigate()
    const [rating, setRating] = useState(0)
    const [title, setTitle] = useState('')
    const [comment, setComment] = useState('')
    const [files, setFiles] = useState([])
    const [previews, setPreviews] = useState([])
    const [photoNote, setPhotoNote] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    useEffect(() => {
        const urls = files.map((f) => URL.createObjectURL(f))
        setPreviews(urls)
        return () => urls.forEach((u) => URL.revokeObjectURL(u))
    }, [files])

    function addPhotos(fileList) {
        const { accepted, rejected } = filterImageFiles(fileList)
        const { take, skipped } = fitToLimit(accepted, files.length, MAX_REVIEW_PHOTOS)
        const notes = []
        if (rejected.length) notes.push('Only JPG, PNG or WebP photos can be added.')
        if (skipped) notes.push(`You can add up to ${MAX_REVIEW_PHOTOS} photos.`)
        setPhotoNote(notes.join(' '))
        if (take.length) setFiles((prev) => [...prev, ...take])
    }

    async function submit(e) {
        e.preventDefault()
        if (!rating) return setError('Choose a star rating.')
        setBusy(true)
        setError('')
        try {
            const { failed } = await submitReview(userId, {
                productId: item.product_id, orderItemId: item.id, rating,
                title: title.trim(), comment: comment.trim(), files,
            })
            const flash = failed.length
                ? `Your review was saved, but ${failed.length === 1 ? 'one photo' : `${failed.length} photos`} couldn’t be uploaded. It will be checked before it appears in the store.`
                : 'Thank you! Your review will appear once we have checked it.'
            navigate('/account/reviews', { replace: true, state: { flash } })
        } catch (err) {
            console.error(err)
            setError(accountErrorMessage(err))
            setBusy(false)
        }
    }

    return (
        <section className="max-w-xl">
            <p className="text-sm"><Link to="/account/reviews" className="underline">← My reviews</Link></p>
            <h2 className="mt-2 text-3xl text-maroon">Review {item.product_name}</h2>
            <p className="text-sm">Order {item.order.order_number}. Reviews are checked before they appear in the store.</p>

            <form onSubmit={submit} noValidate className="mt-6 space-y-5">
                <fieldset>
                    <legend className="text-sm font-medium">Your rating *</legend>
                    <div className="mt-2 flex gap-4 text-sm">
                        {[1, 2, 3, 4, 5].map((n) => (
                            <label key={n} className="flex items-center gap-1">
                                <input type="radio" name="rating" value={n} checked={rating === n} onChange={() => setRating(n)} />
                                {n}<span className="sr-only"> {n === 1 ? 'star' : 'stars'}</span><span aria-hidden="true">★</span>
                            </label>
                        ))}
                    </div>
                </fieldset>
                <div>
                    <label htmlFor="rv-title" className="text-sm font-medium">Title (optional)</label>
                    <input id="rv-title" className={input} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div>
                    <label htmlFor="rv-comment" className="text-sm font-medium">Your review (optional)</label>
                    <textarea id="rv-comment" rows={5} maxLength={2000} className={input} value={comment} onChange={(e) => setComment(e.target.value)} />
                </div>

                <div>
                    <p className="text-sm font-medium">Photos (optional, up to {MAX_REVIEW_PHOTOS})</p>
                    {previews.length > 0 && (
                        <ul className="mt-2 flex flex-wrap gap-3">
                            {previews.map((url, i) => (
                                <li key={url} className="relative">
                                    <img src={url} alt={`Photo ${i + 1} to upload`} className="h-24 w-24 rounded-xl object-cover shadow-float" />
                                    <button type="button" aria-label={`Remove photo ${i + 1}`} disabled={busy}
                                        onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                                        className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-maroon text-ink-light shadow-float">
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {files.length < MAX_REVIEW_PHOTOS && (
                        <label className="btn-secondary mt-3 cursor-pointer gap-2 focus-within:ring-2 focus-within:ring-maroon">
                            <ImagePlus size={16} aria-hidden="true" /> Add photos
                            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" disabled={busy}
                                onChange={(e) => { addPhotos(e.target.files); e.target.value = '' }} />
                        </label>
                    )}
                    {photoNote && <p role="status" className="mt-2 text-sm text-maroon">{photoNote}</p>}
                    <p className="mt-2 text-xs opacity-80">
                        Please share photos of the item only. Photos are resized automatically and checked before they appear in the store.
                    </p>
                </div>

                {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
                <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? (files.length ? 'Uploading…' : 'Sending…') : 'Submit review'}
                </button>
            </form>
        </section>
    )
}