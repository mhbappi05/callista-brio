import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="container-page py-16" aria-busy="true">Loading…</p>
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/auth?next=${next}`} replace />
  }
  return children
}