import { Link } from 'react-router-dom'
import CartLineItem from '@/components/cart/CartLineItem.jsx'
import CartSummary from '@/components/cart/CartSummary.jsx'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useCart } from '@/context/CartContext'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function Cart() {
  useDocumentTitle('Your cart')
  const { items, loading, error, reload, ready } = useCart()

  if (error) return <div className="container-page"><ErrorState error={error} onRetry={reload} /></div>
  if (!ready) return <p className="container-page py-16" aria-busy="true">Loading…</p>

  if (items.length === 0 && !loading) {
    return (
      <div className="container-page">
        <EmptyState title="Your cart is empty" message="Find something you love in the shop."
          action={<Link to="/shop" className="btn-primary">Browse the shop</Link>} />
      </div>
    )
  }

  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">Your cart</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <ul>{items.map((item) => <CartLineItem key={item.key} item={item} />)}</ul>
        <aside className="h-fit border border-maroon/20 p-5"><CartSummary /></aside>
      </div>
    </section>
  )
}