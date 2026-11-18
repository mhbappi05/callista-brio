import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { isInternalUrl } from '@/utils/banners'
import { ArtJhumka, ArtMoon, ArtPearl } from './HeroArt.jsx'

const ART = { pearl: ArtPearl, jhumka: ArtJhumka, moon: ArtMoon }
const INTERVAL = 6000

// Shown when no banner is live.
export const DEFAULT_SLIDES = [
  { id: 'd1', badge: 'Handcrafted', title: 'Made by hand, worn with joy',
    subtitle: 'Jhumkas, studs, hoops and hand-painted pieces, delivered across Bangladesh.',
    ctaLabel: 'Shop the collection', ctaUrl: '/shop', art: 'pearl', tone: 'dark' },
  { id: 'd2', badge: 'Our drops', title: 'Collections with a story',
    subtitle: 'Explore each drop, from soft florals to bold retro pieces.',
    ctaLabel: 'See collections', ctaUrl: '/collections', art: 'jhumka', tone: 'dark' },
  { id: 'd3', badge: 'Our story', title: 'Every piece has a maker',
    subtitle: 'Meet the hands and ideas behind Callista Brio.',
    ctaLabel: 'Read our story', ctaUrl: '/about', art: 'moon', tone: 'light' },
]

const TONES = {
  dark: {
    text: 'text-ink',
    badge: 'bg-maroon text-ink-light',
    scrim: 'bg-gradient-to-t from-cream/90 via-cream/50 to-transparent md:bg-gradient-to-r md:from-cream/90 md:via-cream/40 md:to-transparent',
    cta: 'btn-primary',
  },
  light: {
    text: 'text-white',
    badge: 'bg-gold text-ink',
    scrim: 'bg-gradient-to-t from-ink/85 via-ink/45 to-transparent md:bg-gradient-to-r md:from-ink/80 md:via-ink/40 md:to-transparent',
    cta: 'btn-primary !bg-gold !text-ink hover:!bg-cream',
  },
}

function SlideLink({ url, className, children }) {
  if (isInternalUrl(url)) return <Link to={url} className={className}>{children}</Link>
  return (
    <a href={url} className={className} target="_blank" rel="noopener noreferrer">
      {children}<span className="sr-only"> (opens in a new tab)</span>
    </a>
  )
}

const endDate = (iso) =>
  new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short' })

export default function HeroSlider({ slides }) {
  const n = slides.length
  const reduced = usePrefersReducedMotion()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false) // mouse over the banner, or keyboard focus inside it
  const [visible, setVisible] = useState(() => !document.hidden)
  const startX = useRef(null)
  const swiped = useRef(false) // a swipe also ends in a click; this stops it counting twice

  const current = n ? index % n : 0
  const autoplay = playing && !paused && visible && !reduced && n > 1
  const next = () => setIndex((i) => (i + 1) % n)
  const prev = () => setIndex((i) => (i - 1 + n) % n)

  useEffect(() => {
    const onChange = () => setVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  // Restarts after every change, so a click or swipe gets a full interval.
  useEffect(() => {
    if (!autoplay) return undefined
    const t = setTimeout(() => setIndex((i) => (i + 1) % n), INTERVAL)
    return () => clearTimeout(t)
  }, [autoplay, current, n])

  if (!n) return null

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Offers and stories"
      className={`relative h-[26rem] overflow-hidden rounded-2xl shadow-float-lg lg:h-[30rem] ${n > 1 ? 'cursor-pointer select-none' : ''}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') prev()
        if (e.key === 'ArrowRight') next()
      }}
      // Click anywhere on the banner for the next slide (links and buttons keep their own job).
      onClick={(e) => {
        if (swiped.current) {
          swiped.current = false
          return
        }
        if (n > 1 && !e.target.closest('a, button')) next()
      }}
      onPointerDown={(e) => {
        startX.current = e.clientX
        swiped.current = false
      }}
      onPointerUp={(e) => {
        if (startX.current == null) return
        const dx = e.clientX - startX.current
        startX.current = null
        if (Math.abs(dx) > 50) {
          swiped.current = true
          if (dx < 0) next()
          else prev()
        }
      }}
      onPointerCancel={() => { startX.current = null }}
    >
      {/* Invisible until a keyboard user tabs to it: the pause control that accessibility rules require. */}
      {!reduced && n > 1 && (
        <button type="button" onClick={() => setPlaying((p) => !p)}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-full focus:bg-cream focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-maroon focus:shadow-float">
          {playing ? 'Pause slideshow' : 'Play slideshow'}
        </button>
      )}

      <div aria-live={autoplay ? 'off' : 'polite'} className="h-full">
        {slides.map((s, i) => {
          const active = i === current
          const tone = TONES[s.tone] ?? TONES.light
          const Art = s.art ? ART[s.art] : null
          const badge = s.badge ?? (s.kind === 'offer' ? 'Offer' : 'News')

          return (
            <div key={s.id} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`}
              aria-hidden={!active}
              {...(active ? {} : { inert: '' })}
              className={`absolute inset-0 transition-opacity duration-700 ${active ? 'opacity-100' : 'opacity-0'}`}>
              {s.imageUrl ? (
                <img src={s.imageUrl} alt="" loading={i === 0 ? 'eager' : 'lazy'} decoding="async"
                  className={`absolute inset-0 h-full w-full object-cover transition-transform duration-[7000ms] ease-out motion-reduce:transition-none ${active ? 'scale-105' : 'scale-100'} motion-reduce:scale-100`} />
              ) : Art ? (
                <Art />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-maroon to-ink" />
              )}
              <div className={`absolute inset-0 ${tone.scrim}`} />

              <div className={`relative z-10 flex h-full items-end px-6 pb-20 pt-6 sm:px-12 md:items-center md:pb-6 ${tone.text}`}>
                <div className={`max-w-xl transition-all duration-700 delay-200 ${active ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
                  <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${tone.badge}`}>{badge}</span>
                  <h2 className="mt-3 font-display text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">{s.title}</h2>
                  {s.subtitle && <p className="mt-3 max-w-md text-base sm:text-lg">{s.subtitle}</p>}
                  {s.endsAt && <p className="mt-2 text-sm opacity-90">Until {endDate(s.endsAt)}</p>}
                  {s.ctaLabel && s.ctaUrl && (
                    <SlideLink url={s.ctaUrl} className={`${tone.cta} mt-5`}>{s.ctaLabel}</SlideLink>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dots only: centered, no background. A white fill with a maroon edge shows on pale slides,
          and the maroon pill with a white edge shows on dark ones. */}
      {n > 1 && (
        <div role="group" aria-label="Choose a slide" className="absolute inset-x-0 bottom-2 z-20 flex justify-center">
          {slides.map((s, i) => (
            <button key={s.id} type="button" aria-label={`Show slide ${i + 1}: ${s.title}`}
              aria-current={i === current ? 'true' : undefined} onClick={() => setIndex(i)} className="p-2">
              <span className={`block h-2.5 rounded-full shadow-md transition-all duration-300 ${
                i === current ? 'w-7 bg-maroon ring-2 ring-white' : 'w-2.5 bg-white ring-1 ring-maroon/50'
              }`} />
            </button>
          ))}
        </div>
      )}
    </section>
  )
}