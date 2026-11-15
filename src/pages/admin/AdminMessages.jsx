import { useState } from 'react'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAuth } from '@/context/AuthContext'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { deleteMessage, listMessages, updateMessage } from '@/services/adminMessageService'
import { formatDhakaDate } from '@/utils/orderLabels'

const TABS = [['new', 'New'], ['read', 'Read'], ['replied', 'Replied'], ['archived', 'Archived']]

// What each status can move to: [new status, button label, primary?]
const MOVES = {
    new: [['read', 'Mark as read', true], ['replied', 'Mark as replied'], ['archived', 'Archive']],
    read: [['replied', 'Mark as replied', true], ['archived', 'Archive'], ['new', 'Mark as unread']],
    replied: [['archived', 'Archive'], ['read', 'Reopen']],
    archived: [['read', 'Restore']],
}

function MessageCard({ m, canDelete, onChanged }) {
    const action = useAction()
    const [note, setNote] = useState(m.staff_note ?? '')
    const mailto = `mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`

    async function change(values) {
        const r = await action.run(() => updateMessage(m.id, values))
        if (r.ok) onChanged()
    }
    async function remove() {
        if (!window.confirm('Delete this message permanently?')) return
        const r = await action.run(() => deleteMessage(m.id))
        if (r.ok) onChanged()
    }

    return (
        <li className="space-y-3 p-4 text-sm">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <p className="text-base font-medium">{m.subject}</p>
                    <p>{m.name} · <a className="underline" href={`mailto:${m.email}`}>{m.email}</a></p>
                    <p className="opacity-70">{formatDhakaDate(m.created_at)}</p>
                </div>
                {m.status === 'new' && <Badge tone="warn">New</Badge>}
            </div>

            <p className="whitespace-pre-line rounded-xl bg-blush/40 p-3">{m.message}</p>

            <label className="block">Private note (only staff see this)
                <textarea rows={2} maxLength={1000} className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>

            <ErrorLine message={action.error} />
            <div className="flex flex-wrap items-center gap-2">
                <a href={mailto} className={`btn-primary ${smallBtn}`}>Reply by email</a>
                {MOVES[m.status].map(([to, label, primary]) => (
                    <button key={to} type="button" className={`${primary ? 'btn-primary' : 'btn-secondary'} ${smallBtn}`}
                        disabled={action.busy} onClick={() => change({ status: to })}>{label}</button>
                ))}
                {note.trim() !== (m.staff_note ?? '') && (
                    <button type="button" className={`btn-secondary ${smallBtn}`} disabled={action.busy}
                        onClick={() => change({ staff_note: note.trim() || null })}>Save note</button>
                )}
                {canDelete && (
                    <button type="button" className="ml-auto underline" disabled={action.busy} onClick={remove}>Delete</button>
                )}
            </div>
        </li>
    )
}

export default function AdminMessages() {
    useDocumentTitle('Messages (admin)')
    const { profile } = useAuth()
    const [tab, setTab] = useState('new')
    const { data, error, loading, reload } = useAsync(() => listMessages(tab), [tab])

    return (
        <section>
            <PageHeader title="Messages" />
            <p className="mt-2 text-sm">Messages sent from the Contact page. Replying opens your email app, because the store doesn’t send email itself.</p>

            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Message status">
                {TABS.map(([key, label]) => (
                    <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                        className={`rounded-full px-4 py-2 text-sm ${tab === key ? 'bg-maroon text-ink-light' : 'border border-maroon/40'}`}>{label}</button>
                ))}
            </div>

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">Nothing here.</p>
                        : (
                            <ul className="float-card mt-4 divide-y divide-maroon/15">
                                {data.map((m) => (
                                    <MessageCard key={m.id} m={m} canDelete={profile?.role === 'owner'} onChanged={reload} />
                                ))}
                            </ul>
                        )}
        </section>
    )
}