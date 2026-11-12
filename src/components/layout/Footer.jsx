import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-maroon text-ink-light">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Callista Brio</p>
          <p className="mt-2 text-sm opacity-80">Handcrafted pieces for the woman who shines.</p>
        </div>
        <nav aria-label="Shop links">
          <p className="font-display text-lg">Shop</p>
          <ul className="mt-2 space-y-1 text-sm opacity-90">
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/collections">Collections</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help links">
          <p className="font-display text-lg">Help</p>
          <ul className="mt-2 space-y-1 text-sm opacity-90">
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/policies/shipping">Delivery</Link></li>
            <li><Link to="/policies/returns">Returns</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-ink-light/20 py-4 text-center text-xs opacity-70">
        © {new Date().getFullYear()} Callista Brio
      </p>
    </footer>
  )
}
