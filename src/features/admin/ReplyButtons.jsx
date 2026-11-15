import { useState } from 'react'
import { Copy } from 'lucide-react'
import { replyLinks } from '@/utils/mailLinks'
import { smallBtn } from './ui.jsx'

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        // Fallback for browsers that block the clipboard API.
        try {
            const el = document.createElement('textarea')
            el.value = text
            el.setAttribute('readonly', '')
            el.style.position = 'fixed'
            el.style.opacity = '0'
            document.body.appendChild(el)
            el.select()
            const ok = document.execCommand('copy')
            el.remove()
            return ok
        } catch {
            return false
        }
    }
}

export default function ReplyButtons({ message }) {
    const [copied, setCopied] = useState('') // '' | 'ok' | 'fail'
    const links = replyLinks(message)

    async function copy() {
        const ok = await copyText(message.email)
        setCopied(ok ? 'ok' : 'fail')
        setTimeout(() => setCopied(''), 2500)
    }

    return (
        <div role="group" aria-label="Reply by email" className="flex flex-wrap items-center gap-2">
            <a href={links.gmail} target="_blank" rel="noopener noreferrer" className={`btn-primary ${smallBtn}`}>
                Reply in Gmail<span className="sr-only"> (opens in a new tab)</span>
            </a>
            <a href={links.mailto} className={`btn-secondary ${smallBtn}`}>Open mail app</a>
            <button type="button" className={`btn-secondary ${smallBtn} gap-1.5`} onClick={copy}>
                <Copy size={14} aria-hidden="true" /> Copy email
            </button>
            <span role="status" className="text-xs">
                {copied === 'ok' && 'Email address copied.'}
                {copied === 'fail' && 'Couldn’t copy. Select the address above instead.'}
            </span>
        </div>
    )
}