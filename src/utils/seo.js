import { getAvailableStock, getEffectivePrice } from './pricing.js'

export function truncate(text, max = 160) {
    const clean = String(text ?? '').replace(/\s+/g, ' ').trim()
    if (clean.length <= max) return clean
    return `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`
}

export function productJsonLd(product, { siteUrl, imageUrls = [] }) {
    const url = `${siteUrl}/product/${product.slug}`
    const inStock = getAvailableStock(product, null) > 0
    const availability = inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock'
    const variants = product.has_variants ? (product.variants ?? []).filter((v) => v.is_active) : []

    let offers
    if (variants.length) {
        const prices = variants.map((v) => getEffectivePrice(product, v))
        offers = {
            '@type': 'AggregateOffer', priceCurrency: 'BDT', url, availability,
            lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: variants.length,
        }
    } else {
        offers = {
            '@type': 'Offer', priceCurrency: 'BDT', url, availability,
            price: getEffectivePrice(product, null),
        }
    }

    const ld = {
        '@context': 'https://schema.org', '@type': 'Product', name: product.name, url,
        brand: { '@type': 'Brand', name: 'Callista Brio' }, offers,
    }
    if (product.description) ld.description = truncate(product.description, 500)
    if (imageUrls.length) ld.image = imageUrls
    if (product.sku && !product.has_variants) ld.sku = product.sku
    if (product.material) ld.material = product.material
    if (product.color) ld.color = product.color
    return ld
}

export function breadcrumbJsonLd(product, siteUrl) {
    const crumbs = [
        { name: 'Home', url: `${siteUrl}/` },
        { name: 'Shop', url: `${siteUrl}/shop` },
    ]
    if (product.category) {
        crumbs.push({ name: product.category.name, url: `${siteUrl}/shop?category=${product.category.slug}` })
    }
    crumbs.push({ name: product.name, url: `${siteUrl}/product/${product.slug}` })
    return {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })),
    }
}

export function productMeta(product, { siteUrl, imageUrls = [] }) {
    return {
        title: product.name,
        description: truncate(
            product.description || `${product.name} by Callista Brio. Handcrafted jewelry delivered across Bangladesh.`
        ),
        image: imageUrls[0] ?? null,
        jsonLd: [productJsonLd(product, { siteUrl, imageUrls }), breadcrumbJsonLd(product, siteUrl)],
    }
}