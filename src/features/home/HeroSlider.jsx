import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import { isInternalUrl } from '@/utils/banners'
import { ArtJhumka, ArtMoon, ArtPearl } from './HeroArt.jsx'

const ART = { pearl: ArtPearl, jhumka: ArtJhumka, moon: ArtMoon }
const INTERVAL = 6000

// Shown when no banner is live.
export const DEFAULT_SLIDES = [
    {
        id: 'd1', badge: 'Handcrafted', title: 'Made by hand, worn with joy',
        subtitle: 'Jhumkas, studs, hoops and hand-painted pieces, delivered across Bangladesh.',
        ctaLabel: 'Shop the collection', ctaUrl: '/shop', art: 'pearl', tone: 'dark'
    },
    {
        id: 'd2', badge: 'Our drops', title: 'Collections with a story',
        subtitle: 'Explore each drop, from soft florals to bold retro pieces.',
        ctaLabel: 'See collections', ctaUrl: '/collections', art: 'jhumka', tone: 'dark'
    },
    {
        id: 'd3', badge: 'Our story', title: 'Every piece has a maker',
        subtitle: 'Meet the hands and ideas behind Callista Brio.',
        ctaLabel: 'Read our story', ctaUrl: '/about', art: 'moon', tone: 'light'
    },
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
    const [paused, setPaused] = useState(false) // hover or keyboard focus
    const [visible, setVisible] = useState(() => !document.hidden)
    const startX = useRef(null)

    const current = n ? index % n : 0
    const autoplay = playing && !paused && visible && !reduced && n > 1
    const next = () => setIndex((i) => (i + 1) % n)
    const prev = () => setIndex((i) => (i - 1 + n) % n)

    useEffect(() => {
        const onChange = () => setVisible(!document.hidden)
        document.addEventListener('visibilitychange', onChange)
        return () => document.removeEventListener('visibilitychange', onChange)
    }, [])

    // Restarts after every change, so a manual click gets a full interval.
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
            className="relative h-[26rem] overflow-hidden rounded-2xl shadow-float-lg lg:h-[30rem]"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            onKeyDown={(e) => {
                if (e.key === 'ArrowLeft') prev()
                if (e.key === 'ArrowRight') next()
            }}
            onPointerDown={(e) => { startX.current = e.clientX }}
            onPointerUp={(e) => {
                if (startX.current == null) return
                const dx = e.clientX - startX.current
                startX.current = null
                if (Math.abs(dx) > 50) (dx < 0 ? next : prev)()
            }}
            onPointerCancel={() => { startX.current = null }}
        >
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

            {n > 1 && (
                <div className="absolute inset-x-0 bottom-3 z-20 flex items-center justify-between px-4 sm:px-6">
                    <div role="group" aria-label="Choose a slide" className="flex items-center gap-2 rounded-full bg-cream/90 px-3 py-2 shadow-float">
                        {slides.map((s, i) => (
                            <button key={s.id} type="button" aria-label={`Show slide ${i + 1}: ${s.title}`}
                                aria-current={i === current ? 'true' : undefined} onClick={() => setIndex(i)}
                                className={`h-2.5 rounded-full transition-all duration-300 ${i === current ? 'w-7 bg-maroon' : 'w-2.5 bg-maroon/30 hover:bg-maroon/60'}`} />
                        ))}
                    </div>
                    <div className="flex items-center rounded-full bg-cream/90 p-1 text-maroon shadow-float">
                        <button type="button" className="icon-btn rounded-full p-2" aria-label="Previous slide" onClick={prev}><ChevronLeft size={18} /></button>
                        {!reduced && (
                            <button type="button" className="icon-btn rounded-full p-2" aria-label={playing ? 'Pause slideshow' : 'Play slideshow'}
                                onClick={() => setPlaying((p) => !p)}>
                                {playing ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                        )}
                        <button type="button" className="icon-btn rounded-full p-2" aria-label="Next slide" onClick={next}><ChevronRight size={18} /></button>
                    </div>
                </div>
            )}
        </section>
    )
}