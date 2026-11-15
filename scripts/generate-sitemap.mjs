import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildRobots, buildSitemap } from './sitemap-lib.mjs'

function loadDotEnv() {
    for (const file of ['.env.production', '.env']) {
        if (!existsSync(file)) continue
        for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
            if (line.trim().startsWith('#')) continue
            const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
            if (!m) continue
            if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
        }
    }
}

async function fetchProducts(url, key) {
    const out = []
    for (let offset = 0; ; offset += 1000) {
        const res = await fetch(
            `${url}/rest/v1/products?select=slug,updated_at&is_active=eq.true&order=created_at.desc&limit=1000&offset=${offset}`,
            { headers: { apikey: key } }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const page = await res.json()
        out.push(...page)
        if (page.length < 1000) return out
    }
}

async function main() {
    loadDotEnv()
    const url = process.env.VITE_SUPABASE_URL
    const key = process.env.VITE_SUPABASE_ANON_KEY
    const site = process.env.VITE_SITE_URL
    if (!url || !key || !site) {
        console.warn('[sitemap] skipped: set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY and VITE_SITE_URL to generate it.')
        return
    }
    try {
        const products = await fetchProducts(url, key)
        mkdirSync('public', { recursive: true })
        writeFileSync('public/sitemap.xml', buildSitemap(site, products))
        writeFileSync('public/robots.txt', buildRobots(site))
        console.log(`[sitemap] wrote public/sitemap.xml (${products.length} products) and public/robots.txt`)
    } catch (err) {
        console.warn(`[sitemap] skipped, could not read products: ${err.message}`)
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    main()
}