import { describe, it, expect } from 'vitest'
import { breadcrumbJsonLd, productMeta, truncate } from '../src/utils/seo.js'
import { parsePolicy } from '../src/utils/policyText.js'
import { cached, clearCache } from '../src/lib/cache.js'
import { buildRobots, buildSitemap } from '../scripts/sitemap-lib.mjs'

const site = 'https://shop.example.com'
const simple = {
    name: 'Pearl Drops', slug: 'pearl-drops', description: 'Soft pearls.', price: 1000, discount_price: 800,
    has_variants: false, stock_quantity: 3, sku: 'PD-1', category: { name: 'Pearl Drops', slug: 'pearl-drops' },
}

describe('seo', () => {
    it('truncates descriptions on a word boundary', () => {
        const out = truncate('word '.repeat(100), 160)
        expect(out.length).toBeLessThanOrEqual(160)
        expect(out.endsWith('…')).toBe(true)
    })
    it('describes a product on sale as an in-stock Offer in BDT', () => {
        const [product, crumbs] = productMeta(simple, { siteUrl: site, imageUrls: ['https://img/1.webp'] }).jsonLd
        expect(product.offers.price).toBe(800)
        expect(product.offers.priceCurrency).toBe('BDT')
        expect(product.offers.availability).toBe('https://schema.org/InStock')
        expect(crumbs.itemListElement).toHaveLength(4)
    })
    it('reports sold-out products as OutOfStock and omits missing images', () => {
        const meta = productMeta({ ...simple, stock_quantity: 0 }, { siteUrl: site })
        expect(meta.jsonLd[0].offers.availability).toBe('https://schema.org/OutOfStock')
        expect('image' in meta.jsonLd[0]).toBe(false)
    })
    it('uses an AggregateOffer for variants and ignores hidden variants', () => {
        const withVariants = {
            name: 'Studs', slug: 'studs', price: 450, discount_price: null, has_variants: true, stock_quantity: 0,
            variants: [
                { price: null, stock_quantity: 0, is_active: true },
                { price: 500, stock_quantity: 2, is_active: true },
                { price: 9999, stock_quantity: 9, is_active: false },
            ],
        }
        const offers = productMeta(withVariants, { siteUrl: site }).jsonLd[0].offers
        expect(offers['@type']).toBe('AggregateOffer')
        expect([offers.lowPrice, offers.highPrice]).toEqual([450, 500])
    })
    it('builds breadcrumbs without a category', () => {
        expect(breadcrumbJsonLd({ name: 'A', slug: 'a' }, site).itemListElement).toHaveLength(3)
    })
})

describe('policy text parser', () => {
    it('parses headings, paragraphs and lists, and never treats text as HTML', () => {
        const blocks = parsePolicy('# Delivery\nWe deliver.\n\n## Charges\n- A\n- B\n\nNote <b>x</b>')
        expect(blocks.map((b) => b.type)).toEqual(['h', 'p', 'h', 'ul', 'p'])
        expect(blocks[3].items).toEqual(['A', 'B'])
        expect(blocks[4].text).toBe('Note <b>x</b>')
    })
    it('handles empty input', () => {
        expect(parsePolicy('')).toEqual([])
        expect(parsePolicy(null)).toEqual([])
    })
})

describe('cache', () => {
    it('caches, expires, shares in-flight calls and does not cache failures', async () => {
        clearCache()
        let calls = 0
        let t = 0
        const now = () => t
        const fn = async () => ++calls
        expect(await cached('k', 1000, fn, now)).toBe(1)
        expect(await cached('k', 1000, fn, now)).toBe(1)
        t = 1001
        expect(await cached('k', 1000, fn, now)).toBe(2)

        let failures = 0
        const boom = async () => { failures++; throw new Error('x') }
        await expect(cached('e', 1000, boom, now)).rejects.toThrow()
        await expect(cached('e', 1000, boom, now)).rejects.toThrow()
        expect(failures).toBe(2)
    })
})

describe('sitemap and robots', () => {
    it('lists static pages and products, and escapes slugs', () => {
        const xml = buildSitemap(`${site}/`, [{ slug: 'pearl-drops', updated_at: '2026-11-01T10:00:00Z' }, { slug: 'a&b' }])
        expect(xml).toContain(`<loc>${site}/shop</loc>`)
        expect(xml).toContain('<lastmod>2026-11-01</lastmod>')
        expect(xml).toContain('/product/a%26b')
    })
    it('blocks private areas and points to the sitemap', () => {
        const robots = buildRobots(site)
        expect(robots).toContain('Disallow: /admin')
        expect(robots).toContain(`Sitemap: ${site}/sitemap.xml`)
    })
})