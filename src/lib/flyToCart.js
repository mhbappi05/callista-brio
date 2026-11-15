// Flies a small round copy of the product image into the header cart icon.
// Resolves when the animation ends (or straight away when there is nothing to animate).
export function flyToCart({ from, src }) {
    const target = document.querySelector('[data-cart-target]')
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (!from || !src || !target || reduced || typeof Element.prototype.animate !== 'function') {
        return Promise.resolve()
    }

    const a = from.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    if (!a.width || !b.width) return Promise.resolve()

    const size = 72
    const startX = a.left + a.width / 2
    const startY = a.top + a.height / 2
    const dx = b.left + b.width / 2 - startX
    const dy = b.top + b.height / 2 - startY

    const el = document.createElement('img')
    el.src = src
    el.alt = ''
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
        position: 'fixed',
        left: `${startX - size / 2}px`,
        top: `${startY - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        objectFit: 'cover',
        border: '3px solid #fff',
        boxShadow: '0 12px 28px rgba(74,20,26,0.4)',
        zIndex: '9999',
        pointerEvents: 'none',
    })
    document.body.appendChild(el)

    const animation = el.animate(
        [
            { transform: 'translate(0, 0) scale(1)', opacity: 1 },
            // rises in an arc before it drops
            { transform: `translate(${dx * 0.45}px, ${Math.min(dy * 0.45, 0) - 90}px) scale(0.85)`, opacity: 1, offset: 0.4 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.15)`, opacity: 0.5 },
        ],
        { duration: 800, easing: 'cubic-bezier(0.45, 0, 0.2, 1)' }
    )

    return animation.finished
        .catch(() => { })
        .finally(() => {
            el.remove()
            // wiggle the cart icon
            target.classList.remove('cart-bump')
            void target.offsetWidth
            target.classList.add('cart-bump')
            setTimeout(() => target.classList.remove('cart-bump'), 600)
        })
        .then(() => new Promise((resolve) => setTimeout(resolve, 150)))
}