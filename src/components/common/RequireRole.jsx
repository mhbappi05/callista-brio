import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

// UI convenience only. The database enforces these roles on every action.
export default function RequireRole({ roles, children }) {
  const { user, profile, loading, profileLoading } = useAuth()
  const location = useLocation()

  if (loading || (user && profileLoading)) {
    return <p className="container-page py-16" aria-busy="true">Checking access…</p>
  }
  if (!user) {
    return <Navigate to={`/auth?next=${encodeURIComponent(location.pathname)}`} replace />
  }
  if (!profile || !roles.includes(profile.role)) {
    return (
      <section className="container-page py-16">
        <h1 className="text-4xl text-maroon">You don’t have access to this page</h1>
        <Link to="/" className="btn-primary mt-6">Back to the store</Link>
      </section>
    )
  }
  return children
}