import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import PasswordInput from '@/components/common/PasswordInput.jsx'

export default function ResetPassword() {
  useDocumentTitle('Choose a new password')
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <p className="container-page py-16" aria-busy="true">Loading…</p>
  if (!user) {
    return (
      <section className="container-page max-w-md py-12">
        <h1 className="text-4xl text-maroon">This link has expired</h1>
        <p className="mt-3">Reset links work once and expire quickly. Please request a new one.</p>
        <Link to="/auth" className="btn-primary mt-6">Back to sign in</Link>
      </section>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) return setError('Your password must be at least 8 characters.')
    setBusy(true)
    setError('')
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch {
      setError('We couldn’t update your password. Please try again or request a new link.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="container-page max-w-md py-12">
      <h1 className="text-4xl text-maroon">Choose a new password</h1>
      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <div>
          <label htmlFor="new-password" className="text-sm font-medium">New password</label>
          <PasswordInput id="new-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </section>
  )
}