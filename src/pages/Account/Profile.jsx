import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { updateProfile } from '@/services/accountService'
import { normalizeBDPhone } from '@/utils/phone'

const input = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2 text-sm'

export default function Profile() {
    useDocumentTitle('My profile')
    const { user, profile, profileLoading, refreshProfile, updatePassword, signOut } = useAuth()

    if (profileLoading) return <p aria-busy="true">Loading…</p>
    return (
        <section className="max-w-xl space-y-10">
            <DetailsForm key={profile?.full_name + profile?.phone} user={user} profile={profile} onSaved={refreshProfile} />
            <PasswordForm updatePassword={updatePassword} />
            <div>
                <button type="button" className="btn-secondary" onClick={() => signOut()}>Sign out</button>
            </div>
        </section>
    )
}

function DetailsForm({ user, profile, onSaved }) {
    const [name, setName] = useState(profile?.full_name ?? '')
    const [phone, setPhone] = useState(profile?.phone ?? '')
    const [errors, setErrors] = useState({})
    const [msg, setMsg] = useState('')
    const [busy, setBusy] = useState(false)

    async function submit(e) {
        e.preventDefault()
        setMsg('')
        const f = {}
        if (!name.trim()) f.name = 'Enter your name.'
        if (phone.trim() && !normalizeBDPhone(phone)) f.phone = 'Enter a valid Bangladesh mobile number, or leave it blank.'
        setErrors(f)
        if (Object.keys(f).length) return

        setBusy(true)
        try {
            await updateProfile(user.id, { full_name: name.trim(), phone: phone.trim() ? normalizeBDPhone(phone) : null })
            onSaved()
            setMsg('Saved.')
        } catch (err) {
            console.error(err)
            setMsg('We couldn’t save your details. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-4">
            <h2 className="text-3xl text-maroon">Profile</h2>
            <Field id="pr-email" label="Email"><input id="pr-email" className={`${input} opacity-70`} value={user.email ?? ''} disabled /></Field>
            <Field id="pr-name" label="Full name *" error={errors.name}>
                <input id="pr-name" className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />
            </Field>
            <Field id="pr-phone" label="Mobile number" error={errors.phone}>
                <input id="pr-phone" className={input} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
            </Field>
            {msg && <p role="status" className="text-sm">{msg}</p>}
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
        </form>
    )
}

function PasswordForm({ updatePassword }) {
    const [password, setPassword] = useState('')
    const [msg, setMsg] = useState({ type: '', text: '' })
    const [busy, setBusy] = useState(false)

    async function submit(e) {
        e.preventDefault()
        if (password.length < 8) return setMsg({ type: 'error', text: 'Your password must be at least 8 characters.' })
        setBusy(true)
        setMsg({ type: '', text: '' })
        try {
            await updatePassword(password)
            setPassword('')
            setMsg({ type: 'ok', text: 'Password updated.' })
        } catch {
            setMsg({ type: 'error', text: 'We couldn’t update your password. Please try again.' })
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className="space-y-4">
            <h2 className="text-3xl text-maroon">Change password</h2>
            <Field id="pr-password" label="New password">
                <input id="pr-password" type="password" className={input} value={password} autoComplete="new-password"
                    onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {msg.text && <p role={msg.type === 'error' ? 'alert' : 'status'} className={`text-sm ${msg.type === 'error' ? 'text-maroon' : ''}`}>{msg.text}</p>}
            <button type="submit" className="btn-secondary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
        </form>
    )
}