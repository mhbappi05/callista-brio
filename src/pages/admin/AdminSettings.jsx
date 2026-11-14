import { useState } from 'react'
import { ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getSettings, saveSetting } from '@/services/adminSettingsService'

const KEYS = ['payment_methods', 'payment_instructions', 'announcement', 'store_contact']

function Section({ title, children, onSave, hint }) {
    const { busy, error, run } = useAction()
    const [saved, setSaved] = useState(false)
    async function submit(e) {
        e.preventDefault()
        setSaved(false)
        const r = await run(onSave)
        if (r.ok) setSaved(true)
    }
    return (
        <form onSubmit={submit} className="space-y-3 border border-maroon/20 p-4 text-sm" onChange={() => setSaved(false)}>
            <h2 className="font-display text-2xl text-maroon">{title}</h2>
            {hint && <p className="opacity-80">{hint}</p>}
            {children}
            <ErrorLine message={error} />
            {saved && <p role="status">Saved.</p>}
            <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </form>
    )
}

function Forms({ s }) {
    const pm = s.payment_methods ?? {}
    const [methods, setMethods] = useState({ cod: !!pm.cod, bkash_manual: !!pm.bkash_manual, nagad_manual: !!pm.nagad_manual })
    const [instr, setInstr] = useState({
        bkash_manual: s.payment_instructions?.bkash_manual ?? '', nagad_manual: s.payment_instructions?.nagad_manual ?? '',
    })
    const [ann, setAnn] = useState({ enabled: !!s.announcement?.enabled, text: s.announcement?.text ?? '' })
    const [contact, setContact] = useState({
        email: s.store_contact?.email ?? '', phone: s.store_contact?.phone ?? '', whatsapp: s.store_contact?.whatsapp ?? '',
    })

    return (
        <div className="mt-6 space-y-6">
            <Section title="Payment methods" hint="Customers only see the methods you turn on. Confirm your cash-on-delivery rules and your merchant details before enabling anything."
                onSave={() => saveSetting('payment_methods', { ...pm, ...methods })}>
                {[['cod', 'Cash on delivery'], ['bkash_manual', 'bKash (manual payment)'], ['nagad_manual', 'Nagad (manual payment)']].map(([k, label]) => (
                    <label key={k} className="flex items-center gap-2">
                        <input type="checkbox" checked={methods[k]} onChange={(e) => setMethods({ ...methods, [k]: e.target.checked })} /> {label}
                    </label>
                ))}
                <label className="flex items-center gap-2 opacity-60">
                    <input type="checkbox" checked={!!pm.gateway} disabled /> Online payment gateway (available once a provider is set up)
                </label>
            </Section>

            <Section title="Manual payment instructions" hint="Shown to customers at checkout and on the confirmation page. Put your real merchant number and steps here. Do not enter PINs or passwords."
                onSave={() => saveSetting('payment_instructions', { bkash_manual: instr.bkash_manual.trim(), nagad_manual: instr.nagad_manual.trim() })}>
                <label className="block">bKash instructions
                    <textarea rows={3} maxLength={500} className={inputClass} value={instr.bkash_manual} onChange={(e) => setInstr({ ...instr, bkash_manual: e.target.value })} />
                </label>
                <label className="block">Nagad instructions
                    <textarea rows={3} maxLength={500} className={inputClass} value={instr.nagad_manual} onChange={(e) => setInstr({ ...instr, nagad_manual: e.target.value })} />
                </label>
            </Section>

            <Section title="Announcement bar" onSave={() => saveSetting('announcement', { enabled: ann.enabled, text: ann.text.trim() })}>
                <label className="flex items-center gap-2"><input type="checkbox" checked={ann.enabled} onChange={(e) => setAnn({ ...ann, enabled: e.target.checked })} /> Show the bar</label>
                <label className="block">Message
                    <input className={inputClass} maxLength={200} value={ann.text} onChange={(e) => setAnn({ ...ann, text: e.target.value })} />
                </label>
            </Section>

            <Section title="Contact details" hint="Shown on the Contact page. Leave blank anything you don’t want to show."
                onSave={() => saveSetting('store_contact', {
                    email: contact.email.trim() || null, phone: contact.phone.trim() || null, whatsapp: contact.whatsapp.trim() || null,
                })}>
                <label className="block">Email<input type="email" className={inputClass} value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></label>
                <label className="block">Phone<input className={inputClass} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /></label>
                <label className="block">WhatsApp number<input className={inputClass} value={contact.whatsapp} onChange={(e) => setContact({ ...contact, whatsapp: e.target.value })} /></label>
            </Section>
        </div>
    )
}

export default function AdminSettings() {
    useDocumentTitle('Settings (admin)')
    const { data, error, loading, reload } = useAsync(() => getSettings(KEYS), [])
    return (
        <section>
            <PageHeader title="Store settings" />
            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
                    : <Forms s={data} />}
        </section>
    )
}