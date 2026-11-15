import { Link } from 'react-router-dom'
import { ArrowRight, Gem, Paintbrush, PenTool } from 'lucide-react'
import { useAsync } from '@/hooks/useAsync'
import { getPublicSetting } from '@/services/catalogService'

const DEFAULTS = {
    title: 'Made by hand, one piece at a time',
    text: 'Every Callista Brio piece is shaped, painted and finished by hand, so no two are exactly alike.',
}

const STEPS = [
    [PenTool, 'Designed'],
    [Gem, 'Shaped by hand'],
    [Paintbrush, 'Finished with care'],
]

export default function StoryBand() {
    const { data } = useAsync(() => getPublicSetting('home_story'), [])
    const title = data?.title?.trim() || DEFAULTS.title
    const text = data?.text?.trim() || DEFAULTS.text

    return (
        <section aria-labelledby="story-title"
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-maroon via-[#3a1016] to-ink text-ink-light shadow-float-lg">
            <span aria-hidden="true" className="drift absolute -right-16 -top-16 block h-64 w-64 rounded-full bg-gold/15 blur-2xl"
                style={{ '--dur': '24s', '--dx': '-30px', '--dy': '30px', '--rot': '0deg' }} />
            <span aria-hidden="true" className="drift absolute -bottom-20 -left-10 block h-56 w-56 rounded-full bg-blush/10 blur-2xl"
                style={{ '--dur': '28s', '--delay': '2s', '--dx': '40px', '--dy': '-20px', '--rot': '0deg' }} />

            <div className="relative grid items-center gap-10 p-8 sm:p-12 lg:grid-cols-[auto_1fr] lg:gap-16 lg:p-16">
                <div className="relative mx-auto grid h-44 w-44 place-items-center sm:h-52 sm:w-52" aria-hidden="true">
                    <svg viewBox="0 0 100 100" className="absolute inset-0 animate-spin [animation-duration:22s]" focusable="false">
                        <defs><path id="story-circle" d="M50 50m-38 0a38 38 0 1 1 76 0a38 38 0 1 1-76 0" /></defs>
                        <text fontSize="8.2" fill="#fce8eb" fontWeight="500">
                            <textPath href="#story-circle" textLength="236" lengthAdjust="spacing">HANDMADE • ONE OF A KIND •</textPath>
                        </text>
                    </svg>
                    <div className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-gold to-[#b8932a] font-display text-4xl font-bold text-ink shadow-float">
                        CB
                    </div>
                </div>

                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold">Our story</p>
                    <h2 id="story-title" className="mt-2 max-w-xl text-4xl leading-tight sm:text-5xl">{title}</h2>
                    <p className="mt-4 max-w-prose text-lg opacity-90">{text}</p>

                    <ul className="mt-8 grid gap-3 sm:grid-cols-3">
                        {STEPS.map(([Icon, label]) => (
                            <li key={label} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:bg-white/15">
                                <Icon size={20} className="shrink-0 text-gold" aria-hidden="true" />
                                <span className="text-sm">{label}</span>
                            </li>
                        ))}
                    </ul>

                    <Link to="/about" className="story-cta mt-8">
                        <span>Read our story</span>
                        <span className="arrow" aria-hidden="true"><ArrowRight size={20} /></span>
                    </Link>
                </div>
            </div>
        </section>
    )
}