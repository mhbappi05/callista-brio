import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { defaultOgImage, siteUrl } from '@/lib/site'

const BRAND = 'Callista Brio'
const DEFAULT_DESCRIPTION = 'Handcrafted jewelry and accessories from Callista Brio, delivered across Bangladesh.'
// Private pages are never indexed, unless a page says otherwise.
const PRIVATE = /^\/(account|admin|cart|checkout|auth|order-confirmation|track|wishlist)(\/|$)/

function setMeta(attr, key, content) {
    const selector = `meta[${attr}="${key}"]`
    let el = document.head.querySelector(selector)
    if (!content) {
        el?.remove()
        return
    }
    if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
    }
    el.setAttribute('content', content)
}

function setCanonical(href) {
    let el = document.head.querySelector('link[rel="canonical"]')
    if (!href) {
        el?.remove()
        return
    }
    if (!el) {
        el = document.createElement('link')
        el.setAttribute('rel', 'canonical')
        document.head.appendChild(el)
    }
    el.setAttribute('href', href)
}

export function usePageMeta({ title, description, image, noindex, jsonLd } = {}) {
    const { pathname } = useLocation()
    const hidden = noindex ?? PRIVATE.test(pathname)
    const ld = jsonLd ? JSON.stringify(jsonLd).replace(/</g, '\\u003c') : ''

    useEffect(() => {
        const base = siteUrl()
        const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} | Handcrafted jewelry`
        const desc = description || DEFAULT_DESCRIPTION
        const img = image || defaultOgImage()

        document.title = fullTitle
        setMeta('name', 'description', desc)
        setMeta('name', 'robots', hidden ? 'noindex, nofollow' : 'index, follow')
        setMeta('property', 'og:site_name', BRAND)
        setMeta('property', 'og:type', 'website')
        setMeta('property', 'og:title', fullTitle)
        setMeta('property', 'og:description', desc)
        setMeta('property', 'og:url', `${base}${pathname}`)
        setMeta('property', 'og:image', img)
        setMeta('name', 'twitter:card', img ? 'summary_large_image' : 'summary')
        setCanonical(hidden ? null : `${base}${pathname}`) // canonical ignores filters and query strings

        let script = null
        if (ld) {
            script = document.createElement('script')
            script.type = 'application/ld+json'
            script.textContent = ld
            document.head.appendChild(script)
        }
        return () => {
            script?.remove()
        }
    }, [title, description, image, hidden, ld, pathname])
}