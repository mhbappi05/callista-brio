import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function NotFound() {
  useDocumentTitle('Page not found', { noindex: true })
  return (
    <section className="container-page py-16 text-center">
      <h1 className="text-5xl text-maroon">Page not found</h1>
      <p className="mx-auto mt-3 max-w-md">That page doesn’t exist or has moved. Let’s get you back to something beautiful.</p>
      <div className="mt-6 flex justify-center gap-3">
        <Link to="/shop" className="btn-primary">Browse the shop</Link>
        <Link to="/" className="btn-secondary">Go home</Link>
      </div>
    </section>
  )
}