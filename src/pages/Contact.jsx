import { Clock, Facebook, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import ContactForm from '@/features/contact/ContactForm.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getPublicSetting } from '@/services/catalogService'
import { cleanHandle, phoneLinks, socialUrl } from '@/utils/contact'

const DEFAULT_INTRO = 'Choose whichever channel works best for you.'
const DEFAULT_FORM_NOTE = 'We’ll get back to you as soon as we can. If it’s about an order, include your order number.'

function ChannelCard({ icon: Icon, title, value, note, href, external }) {
  const Tag = href ? 'a' : 'div'
  const extra = href && external ? { target: '_blank', rel: 'noopener noreferrer' } : {}
  return (
    <Tag href={href} {...extra} className={`float-card flex items-start gap-4 p-5 ${href ? 'float-lift' : ''}`}>
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-blush text-maroon">
        <Icon size={22} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm opacity-70">{title}</span>
        <span className="block break-words font-display text-2xl text-maroon">{value}</span>
        {note && <span className="mt-1 block text-sm">{note}</span>}
        {href && external && <span className="sr-only"> (opens in a new tab)</span>}
      </span>
    </Tag>
  )
}

export default function Contact() {
  useDocumentTitle('Contact', { description: 'Get in touch with Callista Brio by phone, WhatsApp, email or message.' })
  const { data } = useAsync(() => getPublicSetting('store_contact'), [])
  const c = data ?? {}

  const phone = phoneLinks(c.phone)
  const whatsapp = phoneLinks(c.whatsapp)
  const instagram = cleanHandle('instagram', c.instagram)
  const facebook = cleanHandle('facebook', c.facebook)
  const hasChannels = Boolean(c.phone || c.whatsapp || c.email)
  const hasSocial = Boolean(instagram || facebook)
  const hasLocation = Boolean(c.location_title || c.location_text)

  return (
    <div className="container-page py-12">
      <header className="max-w-2xl">
        <h1 className="text-5xl text-maroon">Contact us</h1>
        <p className="mt-3 text-lg">{c.intro || DEFAULT_INTRO}</p>
      </header>

      {hasChannels && (
        <section aria-labelledby="ct-talk" className="mt-10">
          <h2 id="ct-talk" className="text-3xl text-maroon">Talk to us</h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {c.phone && (
              <li><ChannelCard icon={Phone} title="Phone" value={c.phone} note={c.phone_hours} href={phone?.tel} /></li>
            )}
            {c.whatsapp && (
              <li><ChannelCard icon={MessageCircle} title="WhatsApp" value={c.whatsapp} note={c.whatsapp_note} href={whatsapp?.wa} external /></li>
            )}
            {c.email && (
              <li><ChannelCard icon={Mail} title="Email" value={c.email} note={c.email_note} href={`mailto:${c.email}`} /></li>
            )}
          </ul>
        </section>
      )}

      {hasSocial && (
        <section aria-labelledby="ct-social" className="mt-10">
          <h2 id="ct-social" className="text-3xl text-maroon">Social channels</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {instagram && (
              <li><ChannelCard icon={Instagram} title="Instagram" value={`@${instagram}`} href={socialUrl('instagram', instagram)} external /></li>
            )}
            {facebook && (
              <li><ChannelCard icon={Facebook} title="Facebook" value={`@${facebook}`} href={socialUrl('facebook', facebook)} external /></li>
            )}
          </ul>
        </section>
      )}

      <div className={`mt-10 grid gap-6 ${hasLocation ? 'lg:grid-cols-[1fr_1.4fr]' : ''}`}>
        {hasLocation && (
          <section aria-labelledby="ct-location"
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-maroon to-ink p-8 text-ink-light shadow-float-lg">
            <MapPin size={28} className="text-gold" aria-hidden="true" />
            <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-gold">Studio location</p>
            {c.location_title && <h2 id="ct-location" className="mt-2 text-4xl">{c.location_title}</h2>}
            {c.location_text && <p className="mt-3 whitespace-pre-line opacity-90">{c.location_text}</p>}
            {c.phone_hours && (
              <p className="mt-5 flex items-start gap-2 text-sm opacity-90">
                <Clock size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {c.phone_hours}
              </p>
            )}
          </section>
        )}

        <section aria-labelledby="ct-form" className="float-card p-6 sm:p-8">
          <h2 id="ct-form" className="text-3xl text-maroon">Send us a message</h2>
          <div className="mt-5">
            <ContactForm note={c.form_note || DEFAULT_FORM_NOTE} />
          </div>
        </section>
      </div>
    </div>
  )
}