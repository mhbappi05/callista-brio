import { Link } from 'react-router-dom'
import { Facebook, Instagram, MessageCircle } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getPublicSetting } from '@/services/catalogService'
import { phoneLinks, socialUrl } from '@/utils/contact'

export default function Footer() {
  const { data: contact } = useAsync(() => getPublicSetting('store_contact'), [])
  const c = contact ?? {}

  const socials = [
    { label: 'Instagram', href: socialUrl('instagram', c.instagram), Icon: Instagram },
    { label: 'Facebook', href: socialUrl('facebook', c.facebook), Icon: Facebook },
    { label: 'WhatsApp', href: phoneLinks(c.whatsapp)?.wa, Icon: MessageCircle },
  ].filter((s) => s.href)

  return (
    <footer className="frame mb-4 rounded-3xl bg-maroon text-ink-light shadow-float-lg">
      <div className="grid gap-8 px-6 py-12 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
        <div>
          <p className="font-display text-2xl">Callista Brio</p>
          <p className="mt-2 text-sm opacity-90">Handcrafted pieces for the woman who shines.</p>
          {c.email && <p className="mt-3 text-sm"><a className="underline" href={`mailto:${c.email}`}>{c.email}</a></p>}
          {c.phone && <p className="text-sm"><a className="underline" href={phoneLinks(c.phone)?.tel}>{c.phone}</a></p>}

          {socials.length > 0 && (
            <ul className="mt-4 flex gap-2" aria-label="Follow us">
              {socials.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noopener noreferrer"
                    className="tip tip-up icon-btn grid h-10 w-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-gold hover:text-ink"
                    data-tip={label} aria-label={`Callista Brio on ${label} (opens in a new tab)`}>
                    <Icon size={18} aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          )}
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