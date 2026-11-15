import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import CBLoader from './CBLoader.jsx'

const KEY = 'cb_splash_seen'

function alreadySeen() {
    try {
        return sessionStorage.getItem(KEY) === '1'
    } catch {
        return false
    }
}

export default function Splash() {
    const { loading } = useAuth()
    const [phase, setPhase] = useState(() => (alreadySeen() ? 'gone' : 'show')) // show | fade | gone
    const [minDone, setMinDone] = useState(false)

    // Always show it for at least 1.4 seconds so the animation can finish a drawing.
    useEffect(() => {
        if (phase !== 'show') return undefined
        const t = setTimeout(() => setMinDone(true), 1400)
        return () => clearTimeout(t)
    }, [phase])

    // Never block the store for more than 4 seconds, even if sign-in is slow.
    useEffect(() => {
        if (phase !== 'show') return undefined
        const t = setTimeout(() => setPhase('fade'), 4000)
        return () => clearTimeout(t)
    }, [phase])

    useEffect(() => {
        if (phase === 'show' && !loading && minDone) setPhase('fade')
    }, [phase, loading, minDone])

    useEffect(() => {
        if (phase !== 'fade') return undefined
        try {
            sessionStorage.setItem(KEY, '1')
        } catch {
            // Not critical: the intro simply shows again next time.
        }
        const t = setTimeout(() => setPhase('gone'), 500)
        return () => clearTimeout(t)
    }, [phase])

    if (phase === 'gone') return null

    return (
        <div
            className={`fixed inset-0 z-[100] grid place-items-center bg-cream transition-opacity duration-500 ${phase === 'fade' ? 'pointer-events-none opacity-0' : 'opacity-100'
                }`}
        >
            <div className="flex flex-col items-center gap-3">
                <CBLoader size={120} />
                <p className="font-display text-2xl tracking-wide text-maroon" aria-hidden="true">Callista Brio</p>
            </div>
        </div>
    )
}