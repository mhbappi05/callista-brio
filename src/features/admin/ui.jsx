import { useCallback, useState } from 'react'
import { adminErrorMessage } from '@/services/adminErrors'

export const inputClass = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2 text-sm'
export const smallBtn = '!px-4 !py-2 text-sm'

// Wraps an async action with busy and error state.
// run() resolves to { ok, value } and never throws.
export function useAction() {
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')

    const run = useCallback(async (fn) => {
        setBusy(true)
        setError('')
        try {
            const value = await fn()
            return { ok: true, value }
        } catch (err) {
            console.error(err)
            setError(adminErrorMessage(err))
            return { ok: false }
        } finally {
            setBusy(false)
        }
    }, [])

    return { busy, error, setError, run }
}

const TONES = {
    default: 'bg-blush',
    warn: 'bg-gold/40',
    bad: 'bg-maroon text-ink-light',
    good: 'bg-green-200',
}

export function Badge({ children, tone = 'default' }) {
    return <span className={`inline-block px-2 py-0.5 text-xs ${TONES[tone]}`}>{children}</span>
}

export function ErrorLine({ message }) {
    return message ? <p role="alert" className="text-sm text-maroon">{message}</p> : null
}

export function PageHeader({ title, children }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-4xl text-maroon">{title}</h1>
            {children}
        </div>
    )
}

export function paymentTone(status) {
    if (status === 'paid') return 'good'
    if (status === 'failed' || status === 'requires_review') return 'bad'
    if (status === 'pending') return 'warn'
    return 'default'
}