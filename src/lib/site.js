export const siteUrl = () => (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/+$/, '')
export const defaultOgImage = () => import.meta.env.VITE_DEFAULT_OG_IMAGE || null