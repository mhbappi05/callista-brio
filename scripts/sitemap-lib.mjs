export const STATIC_PATHS = [
    '/', '/shop', '/collections', '/about', '/contact', '/faq',
    '/policies/shipping', '/policies/returns', '/policies/privacy', '/policies/terms',
]

const esc = (s) =>
    String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export function buildSitemap(siteUrl, products) {
    const base = siteUrl.replace(/\/+$/, '')
    const urls = [
        ...STATIC_PATHS.map((p) => ({ loc: `${base}${p}` })),
        ...products.map((p) => ({
            loc: `${base}/product/${encodeURIComponent(p.slug)}`,
            lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined,
        })),
    ]
    const rows = urls
        .map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`)
        .join('\n')
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`
}

export function buildRobots(siteUrl) {
    const base = siteUrl.replace(/\/+$/, '')
    return [
        'User-agent: *', 'Allow: /',
        'Disallow: /admin', 'Disallow: /account', 'Disallow: /cart', 'Disallow: /checkout',
        'Disallow: /auth', 'Disallow: /order-confirmation', 'Disallow: /track', 'Disallow: /wishlist',
        '', `Sitemap: ${base}/sitemap.xml`, '',
    ].join('\n')
}