import { useState } from 'react'
import { ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getSettings, saveSetting } from '@/services/adminSettingsService'

const POLICIES = [
    ['policy_shipping', 'Shipping and delivery', 'Cover: delivery areas, charges, timelines, courier, and what happens if a parcel is delayed or can’t be delivered.'],
    ['policy_returns', 'Returns, exchanges and refunds', 'Cover: who can return, the time limit, item condition, how to request, how and when refunds are paid.'],
    ['policy_privacy', 'Privacy policy', 'Cover: what data you collect and why, who processes it (hosting, couriers, payment providers), how long you keep it, how customers can ask for access or deletion.'],
    ['policy_terms', 'Terms and conditions', 'Cover: ordering and pricing, payment, delivery, returns, liability, governing law, contact details.'],
    ['policy_faq', 'FAQ', 'The questions customers ask most. Use “# Question” as a heading line, then the answer below it.'],
]
const KEYS = [
    'payment_methods', 'payment_instructions', 'announcement', 'store_contact', 'return_policy',
    ...POLICIES.map(([key]) => key),
]

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
        <form onSubmit={submit} className="space-y-3 float-card p-4 text-sm" onChange={() => setSaved(false)}>
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
    const rp = s.return_policy ?? {}
    const [ret, setRet] = useState({ enabled: !!rp.enabled, window_days: rp.window_days == null ? '' : String(rp.window_days) })
    const [policies, setPolicies] = useState(() => Object.fromEntries(POLICIES.map(([key]) => [key, s[key]?.body ?? ''])))

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

            <Section title="Returns" hint="Decide your return policy first. Customers can only request a return on delivered orders, within this many days of delivery."
                onSave={() => {
                    const days = Number(ret.window_days)
                    if (ret.enabled && !(Number.isInteger(days) && days >= 1 && days <= 90)) throw new Error('invalid_window')
                    return saveSetting('return_policy', { enabled: ret.enabled, window_days: ret.window_days === '' ? null : days })
                }}>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={ret.enabled} onChange={(e) => setRet({ ...ret, enabled: e.target.checked })} /> Accept return and exchange requests online
                </label>
                <label className="block">Return window (days after delivery)
                    <input type="number" min="1" max="90" className={inputClass} value={ret.window_days} onChange={(e) => setRet({ ...ret, window_days: e.target.value })} />
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

            <Section title="Policy pages and FAQ"
                hint="Shown publicly exactly as written, so use wording you or your legal adviser have approved. Formatting: “# Heading”, “## Subheading”, “- list item”, and a blank line between paragraphs. No HTML."
                onSave={() => Promise.all(POLICIES.map(([key]) => saveSetting(key, { body: policies[key].trim() })))}>
                {POLICIES.map(([key, label, outline]) => (
                    <label key={key} className="block">
                        <span className="font-medium">{label}</span>
                        <span className="block text-xs opacity-70">{outline}</span>
                        <textarea rows={8} maxLength={20000} className={inputClass} value={policies[key]}
                            onChange={(e) => setPolicies({ ...policies, [key]: e.target.value })} />
                    </label>
                ))}
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