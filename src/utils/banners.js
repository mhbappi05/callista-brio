// Internal paths ("/shop") or full web links. "//evil.com" is not allowed.
export const isInternalUrl = (url) => typeof url === 'string' && /^\/(?!\/)/.test(url)
export const isHttpUrl = (url) => typeof url === 'string' && /^https?:\/\/[^\s]+$/i.test(url)
export const validateCtaUrl = (url) => isInternalUrl(url) || isHttpUrl(url)

// Mirrors the database rule: active, started, and not yet ended.
export function bannerStatus(b, now = Date.now()) {
  if (!b.is_active) return 'hidden'
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return 'scheduled'
  if (b.ends_at && new Date(b.ends_at).getTime() <= now) return 'expired'
  return 'live'
}

export function toSlides(banners, urlFor) {
  return banners.map((b) => ({
    id: b.id,
    kind: b.kind,
    title: b.title,
    subtitle: b.subtitle || '',
    ctaLabel: b.cta_label || '',
    ctaUrl: b.cta_url || '',
    imageUrl: b.image_path ? urlFor(b.image_path) : null,
    endsAt: b.ends_at || null,
    tone: 'light',
  }))
}