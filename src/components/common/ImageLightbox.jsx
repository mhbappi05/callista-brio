import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export default function ImageLightbox({ src, alt = '', onClose }) {
    const closeRef = useRef(null)

    useEffect(() => {
        if (!src) return undefined
        const previous = document.activeElement
        closeRef.current?.focus()
        document.body.style.overflow = 'hidden'
        const onKey = (e) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', onKey)
        return () => {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
            previous?.focus?.()
        }
    }, [src, onClose])

    if (!src) return null
    return (
        <div role="dialog" aria-modal="true" aria-label="Photo" onClick={onClose}
            className="fixed inset-0 z-[90] grid place-items-center bg-ink/80 p-4">
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Close photo"
                className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-cream text-maroon shadow-float">
                <X size={20} aria-hidden="true" />
            </button>
            <img src={src} alt={alt} onClick={(e) => e.stopPropagation()}
                className="max-h-full max-w-full rounded-2xl object-contain shadow-float-lg" />
        </div>
    )
}