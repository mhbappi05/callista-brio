import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getPublicSetting } from '@/services/catalogService'

export default function Contact() {
  useDocumentTitle('Contact')
  const { data } = useAsync(() => getPublicSetting('store_contact'), [])
  const rows = [
    ['Email', data?.email, data?.email && `mailto:${data.email}`],
    ['Phone', data?.phone, data?.phone && `tel:${data.phone}`],
    ['WhatsApp', data?.whatsapp, data?.whatsapp && `https://wa.me/${String(data.whatsapp).replace(/\D/g, '')}`],
  ].filter(([, v]) => v)

  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">Contact</h1>
      {rows.length ? (
        <dl className="mt-6 grid max-w-md grid-cols-[6rem_1fr] gap-y-2">
          {rows.map(([k, v, href]) => (
            <div key={k} className="contents">
              <dt className="font-medium">{k}</dt>
              <dd><a className="underline" href={href}>{v}</a></dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-4">Contact details will be added here soon.</p>
      )}
    </section>
  )
}