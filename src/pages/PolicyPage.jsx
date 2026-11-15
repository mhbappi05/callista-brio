import { Link, useParams } from 'react-router-dom'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getDeliveryZones, getPublicSetting } from '@/services/catalogService'
import { formatBDT } from '@/utils/currency'
import { parsePolicy } from '@/utils/policyText'

const PAGES = {
    shipping: { key: 'policy_shipping', title: 'Shipping and delivery' },
    returns: { key: 'policy_returns', title: 'Returns, exchanges and refunds' },
    privacy: { key: 'policy_privacy', title: 'Privacy policy' },
    terms: { key: 'policy_terms', title: 'Terms and conditions' },
    faq: { key: 'policy_faq', title: 'Frequently asked questions' },
}

export default function PolicyPage({ slug: fixedSlug }) {
    const params = useParams()
    const slug = fixedSlug ?? params.slug
    const page = PAGES[slug]
    useDocumentTitle(page ? page.title : 'Page not found', { noindex: !page })

    const content = useAsync(() => (page ? getPublicSetting(page.key) : Promise.resolve(null)), [slug])
    // Live facts from the database, so the page never contradicts checkout.
    const zones = useAsync(() => (slug === 'shipping' ? getDeliveryZones() : Promise.resolve(null)), [slug])
    const returns = useAsync(() => (slug === 'returns' ? getPublicSetting('return_policy') : Promise.resolve(null)), [slug])

    if (!page) {
        return (
            <section className="container-page py-16 text-center">
                <h1 className="text-4xl text-maroon">Page not found</h1>
                <Link to="/" className="btn-primary mt-6">Go home</Link>
            </section>
        )
    }

    const blocks = parsePolicy(content.data?.body)
    const windowDays = returns.data?.enabled ? returns.data.window_days : null

    return (
        <article className="container-page max-w-3xl py-12">
            <h1 className="text-4xl text-maroon">{page.title}</h1>

            {content.loading && !content.data ? (
                <p className="mt-6" aria-busy="true">Loading…</p>
            ) : blocks.length === 0 ? (
                <p className="mt-6">This page is being prepared. In the meantime, please <Link to="/contact" className="underline">contact us</Link> with any questions.</p>
            ) : (
                <div className="mt-6 space-y-4">
                    {blocks.map((b, i) => {
                        if (b.type === 'h') {
                            const Tag = b.level === 2 ? 'h2' : 'h3'
                            return <Tag key={i} className={`font-display text-maroon ${b.level === 2 ? 'mt-8 text-3xl' : 'mt-6 text-2xl'}`}>{b.text}</Tag>
                        }
                        if (b.type === 'ul') {
                            return <ul key={i} className="list-disc space-y-1 pl-6">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul>
                        }
                        return <p key={i} className="whitespace-pre-line">{b.text}</p>
                    })}
                </div>
            )}

            {slug === 'shipping' && zones.data?.length > 0 && (
                <section className="mt-10 border-t border-maroon/20 pt-6">
                    <h2 className="text-2xl text-maroon">Current delivery charges</h2>
                    <ul className="mt-3 space-y-1">
                        {zones.data.map((z) => (
                            <li key={z.code}>
                                {z.name}: {formatBDT(z.fee)}
                                {z.free_delivery_threshold && ` (free on orders over ${formatBDT(z.free_delivery_threshold)})`}
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {slug === 'returns' && windowDays && (
                <section className="mt-10 border-t border-maroon/20 pt-6">
                    <p>Signed-in customers can request a return or exchange online within {windowDays} days of delivery, from their <Link to="/account/orders" className="underline">order page</Link>.</p>
                </section>
            )}

            <p className="mt-10 text-sm">Questions? <Link to="/contact" className="underline">Contact us</Link>.</p>
        </article>
    )
}