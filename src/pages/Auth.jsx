import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import PasswordInput from '@/components/common/PasswordInput.jsx'

const inputClass = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2'

function friendlyError(err) {
  const msg = String(err?.message ?? '').toLowerCase()
  if (msg.includes('invalid login')) return 'The email or password is incorrect.'
  if (msg.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the link.'
  if (msg.includes('already registered')) return 'An account with this email already exists. Try signing in.'
  if (msg.includes('password')) return 'Please choose a stronger password (at least 8 characters).'
  if (msg.includes('rate limit') || msg.includes('too many')) return 'Too many attempts. Please wait a moment and try again.'
  return 'Something went wrong. Please try again.'
}

export default function Auth() {
  useDocumentTitle('Sign in')
  const { user, loading, signIn, signUp, sendPasswordReset } = useAuth()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('login') // login | signup | forgot
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  // Only allow redirects to paths inside this site.
  const raw = params.get('next') ?? '/'
  const next = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/'

  if (!loading && user) return <Navigate to={next} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    const email = form.email.trim()
    if (!email) return setError('Enter your email address.')
    if (mode !== 'forgot' && form.password.length < 8) return setError('Your password must be at least 8 characters.')
    if (mode === 'signup' && !form.fullName.trim()) return setError('Enter your name.')

    setBusy(true)
    try {
      if (mode === 'login') {
        await signIn(email, form.password)
      } else if (mode === 'signup') {
        const { needsConfirmation } = await signUp({ email, password: form.password, fullName: form.fullName.trim() })
        if (needsConfirmation) setMessage('Almost there. We sent a confirmation link to your email.')
      } else {
        await sendPasswordReset(email)
        // Same message whether or not the account exists.
        setMessage('If an account exists for that email, we sent a link to reset your password.')
      }
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setBusy(false)
    }
  }

  const title = { login: 'Sign in', signup: 'Create your account', forgot: 'Reset your password' }[mode]

  return (
    <section className="container-page max-w-md py-12">
      <h1 className="text-4xl text-maroon">{title}</h1>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {mode === 'signup' && (
          <div>
            <label htmlFor="fullName" className="text-sm font-medium">Full name</label>
            <input id="fullName" className={inputClass} value={form.fullName} onChange={set('fullName')} autoComplete="name" />
          </div>
        )}
        <div>
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input id="email" type="email" className={inputClass} value={form.email} onChange={set('email')} autoComplete="email" />
        </div>
        {mode !== 'forgot' && (
          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <PasswordInput id="password" value={form.password} onChange={set('password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
          </div>
        )}

        {error && <p role="alert" className="text-sm text-maroon">{error}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Please wait…' : title}
        </button>
      </form>

      <div className="mt-6 space-y-2 text-sm">
        {mode === 'login' && (
          <>
            <button type="button" className="underline" onClick={() => { setMode('forgot'); setError(''); setMessage('') }}>Forgot your password?</button>
            <p>New here? <button type="button" className="underline" onClick={() => { setMode('signup'); setError(''); setMessage('') }}>Create an account</button></p>
          </>
        )}
        {mode !== 'login' && (
          <button type="button" className="underline" onClick={() => { setMode('login'); setError(''); setMessage('') }}>Back to sign in</button>
        )}
        <p className="opacity-70">You can also browse and add to your cart without an account.</p>
      </div>
    </section>
  )
}