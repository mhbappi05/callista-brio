import { useEffect, useState } from 'react'
import { CheckCircle2, Send } from 'lucide-react'
import Field from '@/components/common/Field.jsx'
import { useAuth } from '@/context/AuthContext'
import { sendContactMessage } from '@/services/contactService'
import { validateContactForm } from '@/utils/contact'

const input = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2 text-sm'
const MAX = 3000

export default function ContactForm({ note }) {
    const { user, profile } = useAuth()
    const [v, setV] = useState({ name: '', email: '', subject: '', message: '', website: '' })
    const [errors, setErrors] = useState({})
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState('')

    // Signed-in customers don't have to retype their details.
    useEffect(() => {
        if (!user) return
        setV((cur) => ({ ...cur, name: cur.name || profile?.full_name || '', email: cur.email || user.email || '' }))
    }, [user, profile])

    const set = (key) => (e) => setV((cur) => ({ ...cur, [key]: e.target.value }))
    const aria = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `ct-${k}-error` : undefined })

    async function submit(e) {
        e.preventDefault()
        if (busy) return
        const found = validateContactForm(v)
        setErrors(found)
        setError('')
        const first = Object.keys(found)[0]
        if (first) {
            document.getElementById(`ct-${first}`)?.focus()
            return
        }

        setBusy(true)
        try {
            await sendContactMessage(v)
            setSent(true)
            setV((cur) => ({ ...cur, subject: '', message: '', website: '' }))
        } catch (err) {
            setError(err.message)
        } finally {
            setBusy(false)
        }
    }

    if (sent) {
        return (
            <div role="status" className="py-6 text-center">
                <CheckCircle2 size={44} className="mx-auto text-maroon" aria-hidden="true" />
                <h3 className="mt-3 text-3xl text-maroon">Thank you, your message was sent</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm">We’ll reply to the email address you gave us.</p>
                <button type="button" className="btn-secondary mt-5" onClick={() => setSent(false)}>Send another message</button>
            </div>
        )
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Field id="ct-name" label="Full name *" error={errors.name}>
                    <input id="ct-name" className={input} value={v.name} onChange={set('name')} autoComplete="name" maxLength={120} {...aria('name')} />
                </Field>
                <Field id="ct-email" label="Email address *" error={errors.email}>
                    <input id="ct-email" type="email" className={input} value={v.email} onChange={set('email')} autoComplete="email" maxLength={254} {...aria('email')} />
                </Field>
            </div>
            <Field id="ct-subject" label="Subject *" error={errors.subject}>
                <input id="ct-subject" className={input} value={v.subject} onChange={set('subject')} maxLength={150} {...aria('subject')} />
            </Field>
            <Field id="ct-message" label="Message *" error={errors.message}>
                <textarea id="ct-message" rows={6} className={input} value={v.message} onChange={set('message')} maxLength={MAX} {...aria('message')} />
                <span className="mt-1 block text-right text-xs opacity-70">{v.message.length}/{MAX}</span>
            </Field>

            {/* Trap for bots: invisible to people, never filled in by them. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Leave this field empty
                    <input name="fax" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} />
                </label>
            </div>

            {note && <p className="text-sm">{note}</p>}
            <p className="text-xs opacity-80">We use your details only to reply to you.</p>
            {error && <p role="alert" className="text-sm text-maroon">{error}</p>}

            <button type="submit" className="btn-primary gap-2" disabled={busy}>
                <Send size={16} aria-hidden="true" /> {busy ? 'Sending…' : 'Send message'}
            </button>
        </form>
    )
}