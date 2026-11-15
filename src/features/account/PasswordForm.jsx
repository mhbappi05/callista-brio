import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import PasswordInput from '@/components/common/PasswordInput.jsx'

export default function PasswordForm({ updatePassword, minLength = 8, title = 'Change password' }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState({ type: '', text: '' })
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (password.length < minLength) return setMsg({ type: 'error', text: `Use at least ${minLength} characters.` })
    if (password !== confirm) return setMsg({ type: 'error', text: 'The two passwords don’t match.' })

    setBusy(true)
    setMsg({ type: '', text: '' })
    try {
      await updatePassword(password)
      setPassword('')
      setConfirm('')
      setMsg({ type: 'ok', text: 'Your password was updated.' })
    } catch {
      setMsg({ type: 'error', text: 'We couldn’t update your password. Sign in again and retry, or use “Forgot your password?”.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {title && <h2 className="text-3xl text-maroon">{title}</h2>}
      <Field id="pw-new" label="New password" hint={`At least ${minLength} characters.`}>
        <PasswordInput id="pw-new" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
      <Field id="pw-confirm" label="Confirm new password">
        <PasswordInput id="pw-confirm" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
      </Field>
      {msg.text && (
        <p role={msg.type === 'error' ? 'alert' : 'status'} className={`text-sm ${msg.type === 'error' ? 'text-maroon' : ''}`}>{msg.text}</p>
      )}
      <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
    </form>
  )
}