import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { accountErrorMessage, getReviewItem, submitReview } from '@/services/accountService'

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
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function submit(e) {
        e.preventDefault()
        if (!rating) return setError('Choose a star rating.')
        setBusy(true)
        setError('')
        try {
            await submitReview(userId, {
                productId: item.product_id, orderItemId: item.id, rating,
                title: title.trim(), comment: comment.trim(),
            })
            navigate('/account/reviews', { replace: true })
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
                {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Sending…' : 'Submit review'}</button>
            </form>
        </section>
    )
}