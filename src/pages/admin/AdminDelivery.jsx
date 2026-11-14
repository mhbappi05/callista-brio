import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listZones, saveZone } from '@/services/adminSettingsService'
import { formatBDT } from '@/utils/currency'
import { DISTRICTS } from '@/utils/districts'

const OFFICIAL = new Map(DISTRICTS.map((d) => [d.toLowerCase(), d]))

function ZoneForm({ zone, onDone, onCancel }) {
    const [v, setV] = useState({
        code: zone?.code ?? '', name: zone?.name ?? '', fee: String(zone?.fee ?? ''),
        free_delivery_threshold: String(zone?.free_delivery_threshold ?? ''),
        districts: (zone?.districts ?? []).join(', '), is_fallback: zone?.is_fallback ?? false,
        is_active: zone?.is_active ?? true, display_order: String(zone?.display_order ?? 0),
    })
    const [errors, setErrors] = useState({})
    const { busy, error, run } = useAction()
    const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

    async function submit(e) {
        e.preventDefault()
        const f = {}
        if (!/^[a-z0-9_]+$/.test(v.code)) f.code = 'Use lowercase letters, numbers and underscores, e.g. inside_dhaka.'
        if (!v.name.trim()) f.name = 'Enter a name.'
        if (v.fee === '' || !(Number(v.fee) >= 0)) f.fee = 'Enter the delivery charge (0 or more).'
        if (v.free_delivery_threshold !== '' && !(Number(v.free_delivery_threshold) > 0)) f.free_delivery_threshold = 'Enter an amount above zero, or leave empty.'
        if (!Number.isInteger(Number(v.display_order))) f.display_order = 'Enter a whole number.'

        const names = v.districts.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
        const unknown = names.filter((n) => !OFFICIAL.has(n.toLowerCase()))
        if (unknown.length) f.districts = `Not recognised: ${unknown.join(', ')}. Use the official spelling (for example Chattogram, Cumilla).`
        if (v.is_fallback && names.length) f.districts = 'The fallback zone covers every district not listed elsewhere, so leave districts empty.'
        if (!v.is_fallback && names.length === 0) f.districts = 'List at least one district, or tick “Fallback”.'
        setErrors(f)
        if (Object.keys(f).length) return

        const r = await run(() => saveZone(zone?.id ?? null, {
            code: v.code, name: v.name.trim(), fee: Number(v.fee),
            free_delivery_threshold: v.free_delivery_threshold === '' ? null : Number(v.free_delivery_threshold),
            districts: [...new Set(names.map((n) => OFFICIAL.get(n.toLowerCase())))],
            is_fallback: v.is_fallback, is_active: v.is_active, display_order: Number(v.display_order),
        }))
        if (r.ok) onDone()
    }

    return (
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
            <Field id="dz-name" label="Name *" error={errors.name}><input id="dz-name" className={inputClass} value={v.name} onChange={set('name')} /></Field>
            <Field id="dz-code" label="Code *" error={errors.code}><input id="dz-code" className={inputClass} value={v.code} onChange={set('code')} disabled={Boolean(zone)} /></Field>
            <Field id="dz-fee" label="Delivery charge (৳) *" error={errors.fee}><input id="dz-fee" type="number" min="0" step="0.01" className={inputClass} value={v.fee} onChange={set('fee')} /></Field>
            <Field id="dz-free" label="Free delivery over (৳, optional)" error={errors.free_delivery_threshold}>
                <input id="dz-free" type="number" min="0" className={inputClass} value={v.free_delivery_threshold} onChange={set('free_delivery_threshold')} />
            </Field>
            <div className="sm:col-span-2">
                <Field id="dz-districts" label="Districts (comma separated)" error={errors.districts}>
                    <textarea id="dz-districts" rows={2} className={inputClass} value={v.districts} onChange={set('districts')} placeholder="Dhaka, Gazipur, Narayanganj" disabled={v.is_fallback} />
                </Field>
            </div>
            <Field id="dz-order" label="Display order" error={errors.display_order}><input id="dz-order" type="number" className={inputClass} value={v.display_order} onChange={set('display_order')} /></Field>
            <div className="space-y-1 self-end text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_fallback} onChange={set('is_fallback')} /> Fallback (all other districts)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Active</label>
            </div>
            <div className="space-y-2 sm:col-span-2">
                <ErrorLine message={error} />
                <div className="flex gap-2">
                    <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Save zone'}</button>
                    <button type="button" className={`btn-secondary ${smallBtn}`} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </form>
    )
}

export default function AdminDelivery() {
    useDocumentTitle('Delivery zones (admin)')
    const { data, error, loading, reload } = useAsync(listZones, [])
    const [editing, setEditing] = useState(null)
    const done = () => { setEditing(null); reload() }

    return (
        <section>
            <PageHeader title="Delivery zones">
                <button type="button" className={`btn-primary ${smallBtn}`} onClick={() => setEditing('new')}>Add zone</button>
            </PageHeader>
            <p className="mt-2 text-sm">Checkout uses the first active zone that lists the customer’s district, otherwise the fallback zone. Without a fallback zone, unlisted districts can’t order.</p>

            {editing === 'new' && <div className="mt-4 border border-maroon/20 p-4"><ZoneForm onDone={done} onCancel={() => setEditing(null)} /></div>}

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4 text-maroon">No zones yet. Customers can’t check out until you add at least one.</p>
                        : (
                            <ul className="mt-4 divide-y divide-maroon/15 border border-maroon/20">
                                {data.map((z) => (
                                    <li key={z.id} className="p-4 text-sm">
                                        {editing === z.id ? <ZoneForm zone={z} onDone={done} onCancel={() => setEditing(null)} /> : (
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">
                                                        {z.name} · {formatBDT(z.fee)} {z.is_fallback && <Badge tone="warn">Fallback</Badge>} {!z.is_active && <Badge>Inactive</Badge>}
                                                    </p>
                                                    {z.free_delivery_threshold && <p>Free over {formatBDT(z.free_delivery_threshold)}</p>}
                                                    <p className="opacity-70">{z.is_fallback ? 'All other districts' : z.districts.join(', ')}</p>
                                                </div>
                                                <button type="button" className="underline" onClick={() => setEditing(z.id)}>Edit</button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
        </section>
    )
}