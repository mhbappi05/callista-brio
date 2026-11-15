import { useState } from 'react'
import { ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getSettings, saveSetting } from '@/services/adminSettingsService'
import { EMAIL_RE, cleanHandle } from '@/utils/contact'

const POLICIES = [
    ['policy_about', 'About us', 'Your story: who makes the pieces, how, and what you stand for. It opens from “Read our story” on the Home page. If left blank, a short default is shown.'],
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
    const ct = s.store_contact ?? {}
    const [contact, setContact] = useState({
        intro: ct.intro ?? '', email: ct.email ?? '', email_note: ct.email_note ?? '',
        phone: ct.phone ?? '', phone_hours: ct.phone_hours ?? '',
        whatsapp: ct.whatsapp ?? '', whatsapp_note: ct.whatsapp_note ?? '',
        instagram: ct.instagram ?? '', facebook: ct.facebook ?? '',
        location_title: ct.location_title ?? '', location_text: ct.location_text ?? '',
        form_note: ct.form_note ?? '',
    })
    const setC = (k) => (e) => setContact({ ...contact, [k]: e.target.value })
    const rp = s.return_policy ?? {}
    const [ret, setRet] = useState({ enabled: !!rp.enabled, window_days: rp.window_days == null ? '' : String(rp.window_days) })
    const [policies, setPolicies] = useState(() => Object.fromEntries(POLICIES.map(([key]) => [key, s[key]?.body ?? ''])))
    const [story, setStory] = useState({ title: s.home_story?.title ?? '', text: s.home_story?.text ?? '' })

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

            <Section title="Home page story" hint="The heading and text beside the “Read our story” button on the Home page. Leave blank to use the default wording."
                onSave={() => saveSetting('home_story', { title: story.title.trim(), text: story.text.trim() })}>
                <label className="block">Heading
                    <input className={inputClass} maxLength={80} value={story.title} onChange={(e) => setStory({ ...story, title: e.target.value })} />
                </label>
                <label className="block">Text
                    <textarea rows={3} maxLength={300} className={inputClass} value={story.text} onChange={(e) => setStory({ ...story, text: e.target.value })} />
                </label>
            </Section>

            <Section title="Contact page"
                hint="Everything on the Contact page comes from here. Leave a field empty to hide that part. For phone numbers outside Bangladesh, include the country code, e.g. +44 20 7946 0958."
                onSave={() => {
                    const email = contact.email.trim()
                    if (email && !EMAIL_RE.test(email)) throw new Error('invalid_email')
                    const instagram = cleanHandle('instagram', contact.instagram)
                    const facebook = cleanHandle('facebook', contact.facebook)
                    if (instagram === null || facebook === null) throw new Error('invalid_handle')
                    const t = (x) => x.trim() || null
                    return saveSetting('store_contact', {
                        intro: t(contact.intro),
                        email: email || null, email_note: t(contact.email_note),
                        phone: t(contact.phone), phone_hours: t(contact.phone_hours),
                        whatsapp: t(contact.whatsapp), whatsapp_note: t(contact.whatsapp_note),
                        instagram: instagram || null, facebook: facebook || null,
                        location_title: t(contact.location_title), location_text: t(contact.location_text),
                        form_note: t(contact.form_note),
                    })
                }}>
                <label className="block">Intro line
                    <input className={inputClass} maxLength={200} value={contact.intro} onChange={setC('intro')} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">Phone<input className={inputClass} value={contact.phone} onChange={setC('phone')} /></label>
                    <label className="block">Phone note (hours)<input className={inputClass} maxLength={120} value={contact.phone_hours} onChange={setC('phone_hours')} placeholder="Sat–Thu, 10 AM – 8 PM" /></label>
                    <label className="block">WhatsApp number<input className={inputClass} value={contact.whatsapp} onChange={setC('whatsapp')} /></label>
                    <label className="block">WhatsApp note<input className={inputClass} maxLength={120} value={contact.whatsapp_note} onChange={setC('whatsapp_note')} /></label>
                    <label className="block">Email<input type="email" className={inputClass} value={contact.email} onChange={setC('email')} /></label>
                    <label className="block">Email note<input className={inputClass} maxLength={120} value={contact.email_note} onChange={setC('email_note')} /></label>
                    <label className="block">Instagram<input className={inputClass} value={contact.instagram} onChange={setC('instagram')} placeholder="callistabrio" /></label>
                    <label className="block">Facebook<input className={inputClass} value={contact.facebook} onChange={setC('facebook')} placeholder="callistabrio" /></label>
                    <label className="block">Location heading<input className={inputClass} maxLength={80} value={contact.location_title} onChange={setC('location_title')} placeholder="Dhaka, Bangladesh" /></label>
                </div>
                <label className="block">Location text
                    <textarea rows={3} maxLength={400} className={inputClass} value={contact.location_text} onChange={setC('location_text')} />
                </label>
                <label className="block">Note above the send button
                    <input className={inputClass} maxLength={200} value={contact.form_note} onChange={setC('form_note')} />
                </label>
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