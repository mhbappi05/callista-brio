const svgProps = {
    className: 'absolute inset-0 h-full w-full',
    viewBox: '0 0 800 400',
    preserveAspectRatio: 'xMaxYMid slice',
    'aria-hidden': 'true',
    focusable: 'false',
}

export function ArtPearl() {
    return (
        <svg {...svgProps}>
            <defs>
                <linearGradient id="pa-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fdf8f5" /><stop offset="1" stopColor="#f8d8dc" /></linearGradient>
                <radialGradient id="pa-pearl" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#ffffff" /><stop offset=".55" stopColor="#f6e7e3" /><stop offset="1" stopColor="#d4b0aa" /></radialGradient>
                <linearGradient id="pa-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6dd8a" /><stop offset="1" stopColor="#b8932a" /></linearGradient>
                <g id="pa-ear">
                    <path d="M-14 -36C-14 -62 16 -62 16 -34C16 -14 0 -8 0 16" stroke="url(#pa-gold)" strokeWidth="4" fill="none" strokeLinecap="round" />
                    <circle cx="0" cy="26" r="9" fill="url(#pa-gold)" />
                    <path d="M0 35V66" stroke="#c9a227" strokeWidth="3" strokeLinecap="round" />
                    <path d="M0 62C-30 62 -50 92 -50 120C-50 150 -28 166 0 166C28 166 50 150 50 120C50 92 30 62 0 62Z" fill="url(#pa-pearl)" />
                    <ellipse cx="-16" cy="108" rx="13" ry="8" fill="#fff" opacity=".8" transform="rotate(-35 -16 108)" />
                </g>
                <path id="pa-star" d="M0 -16L4 -4L16 0L4 4L0 16L-4 4L-16 0L-4 -4Z" />
            </defs>
            <rect width="800" height="400" fill="url(#pa-bg)" />
            <circle cx="640" cy="190" r="200" fill="#f8d8dc" opacity=".7" />
            <circle cx="735" cy="55" r="80" fill="#d4af37" opacity=".16" />
            <circle cx="470" cy="335" r="60" fill="#f8d8dc" />
            <use href="#pa-ear" transform="translate(600 70)" />
            <use href="#pa-ear" transform="translate(715 110) scale(.74)" />
            <use href="#pa-star" transform="translate(520 90)" fill="#d4af37" opacity=".8" />
            <use href="#pa-star" transform="translate(770 320) scale(.8)" fill="#d4af37" opacity=".7" />
            <use href="#pa-star" transform="translate(655 345) scale(.5)" fill="#4a141a" opacity=".5" />
        </svg>
    )
}

export function ArtJhumka() {
    return (
        <svg {...svgProps}>
            <defs>
                <linearGradient id="ja-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1ea" /><stop offset="1" stopColor="#f6cfd3" /></linearGradient>
                <linearGradient id="ja-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6dd8a" /><stop offset="1" stopColor="#b8932a" /></linearGradient>
                <radialGradient id="ja-pearl" cx="35%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#f6e7e3" /><stop offset="1" stopColor="#d4b0aa" /></radialGradient>
                <g id="ja-jhumka">
                    <circle cx="0" cy="-56" r="9" fill="none" stroke="url(#ja-gold)" strokeWidth="5" />
                    <path d="M-46 0A46 46 0 0 1 46 0Z" fill="url(#ja-gold)" />
                    <circle cx="0" cy="-26" r="4" fill="#4a141a" opacity=".45" />
                    <circle cx="-22" cy="-14" r="3.5" fill="#4a141a" opacity=".45" />
                    <circle cx="22" cy="-14" r="3.5" fill="#4a141a" opacity=".45" />
                    <path d="M-46 0H46C80 30 86 80 70 112H-70C-86 80 -80 30 -46 0Z" fill="url(#ja-gold)" />
                    <path d="M-34 28Q0 50 34 28" stroke="#4a141a" strokeWidth="3" fill="none" opacity=".4" strokeLinecap="round" />
                    <path d="M-52 62Q0 90 52 62" stroke="#4a141a" strokeWidth="3" fill="none" opacity=".4" strokeLinecap="round" />
                    <g fill="url(#ja-gold)"><circle cx="-60" cy="112" r="8" /><circle cx="-40" cy="113" r="8" /><circle cx="-20" cy="114" r="8" /><circle cx="0" cy="114" r="8" /><circle cx="20" cy="114" r="8" /><circle cx="40" cy="113" r="8" /><circle cx="60" cy="112" r="8" /></g>
                    <g fill="url(#ja-pearl)"><circle cx="-50" cy="132" r="7" /><circle cx="-30" cy="135" r="7" /><circle cx="-10" cy="137" r="7" /><circle cx="10" cy="137" r="7" /><circle cx="30" cy="135" r="7" /><circle cx="50" cy="132" r="7" /></g>
                </g>
                <path id="ja-star" d="M0 -16L4 -4L16 0L4 4L0 16L-4 4L-16 0L-4 -4Z" />
            </defs>
            <rect width="800" height="400" fill="url(#ja-bg)" />
            <circle cx="650" cy="200" r="190" fill="#fff" opacity=".35" />
            <circle cx="470" cy="60" r="70" fill="#d4af37" opacity=".14" />
            <use href="#ja-jhumka" transform="translate(570 105) scale(1.05)" />
            <use href="#ja-jhumka" transform="translate(722 175) scale(.68)" />
            <use href="#ja-star" transform="translate(480 270)" fill="#d4af37" opacity=".8" />
            <use href="#ja-star" transform="translate(765 60) scale(.7)" fill="#4a141a" opacity=".5" />
        </svg>
    )
}

export function ArtMoon() {
    return (
        <svg {...svgProps}>
            <defs>
                <linearGradient id="ma-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#5a1a22" /><stop offset="1" stopColor="#25090c" /></linearGradient>
                <linearGradient id="ma-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f6dd8a" /><stop offset="1" stopColor="#b8932a" /></linearGradient>
                <mask id="ma-mask"><rect width="800" height="400" fill="#fff" /><circle cx="700" cy="140" r="82" fill="#000" /></mask>
                <path id="ma-star" d="M0 -16L4 -4L16 0L4 4L0 16L-4 4L-16 0L-4 -4Z" />
            </defs>
            <rect width="800" height="400" fill="url(#ma-bg)" />
            <circle cx="640" cy="170" r="210" fill="#d4af37" opacity=".07" />
            <circle cx="655" cy="165" r="96" fill="url(#ma-gold)" mask="url(#ma-mask)" />
            <circle cx="545" cy="300" r="54" fill="none" stroke="url(#ma-gold)" strokeWidth="7" />
            <circle cx="545" cy="246" r="6" fill="url(#ma-gold)" />
            <circle cx="690" cy="312" r="38" fill="none" stroke="url(#ma-gold)" strokeWidth="6" />
            <circle cx="690" cy="274" r="5" fill="url(#ma-gold)" />
            <use href="#ma-star" transform="translate(500 90)" fill="#fce8eb" opacity=".85" />
            <use href="#ma-star" transform="translate(770 240) scale(.8)" fill="#fce8eb" opacity=".7" />
            <use href="#ma-star" transform="translate(590 60) scale(.5)" fill="#d4af37" />
            <use href="#ma-star" transform="translate(760 40) scale(.6)" fill="#fce8eb" opacity=".6" />
            <circle cx="480" cy="210" r="3" fill="#fce8eb" opacity=".6" />
            <circle cx="620" cy="360" r="3" fill="#fce8eb" opacity=".5" />
        </svg>
    )
}