import { Link } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { getPublicSetting } from '@/services/catalogService'

export default function Footer() {
  const { data: contact } = useAsync(() => getPublicSetting('store_contact'), [])

  return (
    <footer className="bg-maroon text-ink-light">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl">Callista Brio</p>
          <p className="mt-2 text-sm opacity-90">Handcrafted pieces for the woman who shines.</p>
          {contact?.email && <p className="mt-3 text-sm"><a className="underline" href={`mailto:${contact.email}`}>{contact.email}</a></p>}
          {contact?.phone && <p className="text-sm"><a className="underline" href={`tel:${contact.phone}`}>{contact.phone}</a></p>}
        </div>
        <nav aria-label="Shop links">
          <p className="font-display text-lg">Shop</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link to="/shop">All products</Link></li>
            <li><Link to="/collections">Collections</Link></li>
            <li><Link to="/about">About us</Link></li>
          </ul>
        </nav>
        <nav aria-label="Help links">
          <p className="font-display text-lg">Help</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link to="/contact">Contact</Link></li>
            <li><Link to="/faq">FAQ</Link></li>
            <li><Link to="/track">Track an order</Link></li>
          </ul>
        </nav>
        <nav aria-label="Policies">
          <p className="font-display text-lg">Policies</p>
          <ul className="mt-2 space-y-1 text-sm">
            <li><Link to="/policies/shipping">Shipping and delivery</Link></li>
            <li><Link to="/policies/returns">Returns and refunds</Link></li>
            <li><Link to="/policies/privacy">Privacy policy</Link></li>
            <li><Link to="/policies/terms">Terms and conditions</Link></li>
          </ul>
        </nav>
      </div>
      <p className="border-t border-ink-light/20 py-4 text-center text-xs opacity-80">
        © {new Date().getFullYear()} Callista Brio
      </p>
    </footer>
  )
}