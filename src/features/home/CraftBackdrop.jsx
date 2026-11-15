const SHAPES = [
    { t: 'pearl', x: '3%', y: '9%', s: 44, dur: 16, delay: 0, dx: 14, dy: -28 },
    { t: 'sparkle', x: '13%', y: '20%', s: 26, dur: 5, delay: 1 },
    { t: 'petal', x: '91%', y: '11%', s: 38, dur: 18, delay: 2, dx: -18, dy: 30, rot: 40 },
    { t: 'hoop', x: '86%', y: '27%', s: 58, dur: 20, delay: 0.5, dx: -10, dy: -22, rot: 30, wide: true },
    { t: 'sparkle', x: '94%', y: '40%', s: 22, dur: 6, delay: 2.5 },
    { t: 'pearl', x: '6%', y: '38%', s: 30, dur: 14, delay: 3, dx: 10, dy: -20, wide: true },
    { t: 'moon', x: '90%', y: '54%', s: 46, dur: 22, delay: 1, dx: -12, dy: -18, rot: 14, wide: true },
    { t: 'petal', x: '4%', y: '58%', s: 34, dur: 19, delay: 4, dx: 16, dy: 26, rot: -30 },
    { t: 'sparkle', x: '10%', y: '72%', s: 28, dur: 5.5, delay: 0.5 },
    { t: 'hoop', x: '93%', y: '74%', s: 44, dur: 17, delay: 2, dx: -8, dy: -24, rot: -20 },
    { t: 'pearl', x: '88%', y: '88%', s: 40, dur: 15, delay: 1.5, dx: -12, dy: -26, wide: true },
    { t: 'sparkle', x: '5%', y: '90%', s: 24, dur: 4.5, delay: 3 },
]

function Shape({ t, s }) {
    if (t === 'pearl') {
        return <span className="block rounded-full shadow-float" style={{ width: s, height: s, background: 'radial-gradient(circle at 35% 30%, #fff, #f6e7e3 55%, #d4b0aa)' }} />
    }
    if (t === 'sparkle') {
        return (
            <svg width={s} height={s} viewBox="-18 -18 36 36" focusable="false">
                <path d="M0 -16L4 -4L16 0L4 4L0 16L-4 4L-16 0L-4 -4Z" fill="#d4af37" />
            </svg>
        )
    }
    if (t === 'petal') {
        return <span className="block" style={{ width: s, height: s * 1.6, borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', background: 'linear-gradient(160deg, #fbe4e7, #f4b9c2)' }} />
    }
    if (t === 'hoop') {
        return <span className="block rounded-full" style={{ width: s, height: s, border: '4px solid #d4af37', boxShadow: 'inset 0 0 0 1px rgb(255 255 255 / .5)' }} />
    }
    if (t === 'moon') {
        return <span className="block rounded-full" style={{ width: s, height: s, boxShadow: `inset -${Math.round(s * 0.28)}px 0 0 0 #d4af37` }} />
    }
    return null
}

// Purely decorative and cheap: only transforms and opacity are animated.
// Reduced-motion visitors get the same shapes, standing still.
export default function CraftBackdrop() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <span className="drift absolute -left-24 top-[30%] block h-72 w-72 rounded-full bg-blush blur-3xl"
                style={{ '--dur': '26s', '--dx': '60px', '--dy': '40px', '--rot': '0deg', opacity: 0.55 }} />
            <span className="drift absolute -right-24 top-[62%] block h-80 w-80 rounded-full blur-3xl"
                style={{ '--dur': '30s', '--delay': '3s', '--dx': '-50px', '--dy': '-30px', '--rot': '0deg', background: 'rgb(212 175 55 / .18)' }} />

            {SHAPES.map((sh, i) => (
                <span key={i}
                    className={`absolute ${sh.t === 'sparkle' ? 'twinkle' : 'drift'} ${sh.wide ? 'hidden lg:block' : ''}`}
                    style={{
                        left: sh.x, top: sh.y, opacity: 0.55,
                        '--dur': `${sh.dur}s`, '--delay': `${sh.delay}s`,
                        '--dx': `${sh.dx ?? 12}px`, '--dy': `${sh.dy ?? -22}px`, '--rot': `${sh.rot ?? 16}deg`,
                    }}>
                    <Shape t={sh.t} s={sh.s} />
                </span>
            ))}
        </div>
    )
}