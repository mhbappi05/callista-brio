import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listCoupons, saveCoupon } from '@/services/adminSettingsService'
import { formatBDT } from '@/utils/currency'
import { formatDhakaDate } from '@/utils/orderLabels'
import { fromLocalInput, toLocalInput } from '@/utils/slug'

function CouponForm({ coupon, onDone, onCancel }) {
    const [v, setV] = useState({
        code: coupon?.code ?? '', description: coupon?.description ?? '',
        discount_type: coupon?.discount_type ?? 'percentage', discount_value: String(coupon?.discount_value ?? ''),
        min_order_amount: String(coupon?.min_order_amount ?? 0), max_discount_amount: String(coupon?.max_discount_amount ?? ''),
        usage_limit: String(coupon?.usage_limit ?? ''), per_customer_limit: String(coupon?.per_customer_limit ?? 1),
        starts_at: toLocalInput(coupon?.starts_at), expires_at: toLocalInput(coupon?.expires_at),
        is_active: coupon?.is_active ?? true,
    })
    const [errors, setErrors] = useState({})
    const { busy, error, run } = useAction()
    const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

    async function submit(e) {
        e.preventDefault()
        const f = {}
        const code = v.code.trim().toUpperCase()
        const value = Number(v.discount_value)
        if (!/^[A-Z0-9_-]{3,32}$/.test(code)) f.code = 'Use 3 to 32 letters, numbers, hyphens or underscores.'
        if (!(value > 0)) f.discount_value = 'Enter a value above zero.'
        if (v.discount_type === 'percentage' && value > 100) f.discount_value = 'A percentage can’t be above 100.'
        if (!(Number(v.min_order_amount) >= 0)) f.min_order_amount = 'Enter 0 or more.'
        if (v.max_discount_amount !== '' && !(Number(v.max_discount_amount) > 0)) f.max_discount_amount = 'Enter an amount above zero, or leave empty.'
        if (v.usage_limit !== '' && !(Number.isInteger(Number(v.usage_limit)) && Number(v.usage_limit) > 0)) f.usage_limit = 'Enter a whole number above zero, or leave empty.'
        if (!(Number.isInteger(Number(v.per_customer_limit)) && Number(v.per_customer_limit) > 0)) f.per_customer_limit = 'Enter a whole number above zero.'
        if (v.starts_at && v.expires_at && new Date(v.starts_at) >= new Date(v.expires_at)) f.expires_at = 'The end must be after the start.'
        setErrors(f)
        if (Object.keys(f).length) return

        const r = await run(() => saveCoupon(coupon?.id ?? null, {
            code, description: v.description.trim() || null, discount_type: v.discount_type, discount_value: value,
            min_order_amount: Number(v.min_order_amount),
            max_discount_amount: v.max_discount_amount === '' ? null : Number(v.max_discount_amount),
            usage_limit: v.usage_limit === '' ? null : Number(v.usage_limit),
            per_customer_limit: Number(v.per_customer_limit),
            starts_at: fromLocalInput(v.starts_at), expires_at: fromLocalInput(v.expires_at), is_active: v.is_active,
        }))
        if (r.ok) onDone()
    }

    return (
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
            <Field id="cp-code" label="Code *" error={errors.code}>
                <input id="cp-code" className={`${inputClass} uppercase`} value={v.code} onChange={set('code')} disabled={Boolean(coupon)} />
            </Field>
            <Field id="cp-desc" label="Description (internal)">
                <input id="cp-desc" className={inputClass} value={v.description} onChange={set('description')} />
            </Field>
            <Field id="cp-type" label="Type">
                <select id="cp-type" className={inputClass} value={v.discount_type} onChange={set('discount_type')}>
                    <option value="percentage">Percentage off</option>
                    <option value="fixed">Fixed amount off (৳)</option>
                </select>
            </Field>
            <Field id="cp-value" label={v.discount_type === 'percentage' ? 'Percent *' : 'Amount (৳) *'} error={errors.discount_value}>
                <input id="cp-value" type="number" min="0" step="0.01" className={inputClass} value={v.discount_value} onChange={set('discount_value')} />
            </Field>
            <Field id="cp-min" label="Minimum order (৳)" error={errors.min_order_amount}>
                <input id="cp-min" type="number" min="0" className={inputClass} value={v.min_order_amount} onChange={set('min_order_amount')} />
            </Field>
            <Field id="cp-max" label="Maximum discount (৳, optional)" error={errors.max_discount_amount}>
                <input id="cp-max" type="number" min="0" className={inputClass} value={v.max_discount_amount} onChange={set('max_discount_amount')} />
            </Field>
            <Field id="cp-limit" label="Total uses (optional)" error={errors.usage_limit}>
                <input id="cp-limit" type="number" min="1" className={inputClass} value={v.usage_limit} onChange={set('usage_limit')} />
            </Field>
            <Field id="cp-per" label="Uses per customer" error={errors.per_customer_limit}>
                <input id="cp-per" type="number" min="1" className={inputClass} value={v.per_customer_limit} onChange={set('per_customer_limit')} />
            </Field>
            <Field id="cp-start" label="Starts (optional)"><input id="cp-start" type="datetime-local" className={inputClass} value={v.starts_at} onChange={set('starts_at')} /></Field>
            <Field id="cp-end" label="Ends (optional)" error={errors.expires_at}><input id="cp-end" type="datetime-local" className={inputClass} value={v.expires_at} onChange={set('expires_at')} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Active</label>
            <div className="space-y-2 sm:col-span-2">
                <ErrorLine message={error} />
                <div className="flex gap-2">
                    <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Save coupon'}</button>
                    <button type="button" className={`btn-secondary ${smallBtn}`} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </form>
    )
}

export default function AdminCoupons() {
    useDocumentTitle('Coupons (admin)')
    const { data, error, loading, reload } = useAsync(listCoupons, [])
    const [editing, setEditing] = useState(null)
    const toggle = useAction()
    const done = () => { setEditing(null); reload() }

    async function toggleActive(c) {
        const r = await toggle.run(() => saveCoupon(c.id, { is_active: !c.is_active }))
        if (r.ok) reload()
    }

    return (
        <section>
            <PageHeader title="Coupons">
                <button type="button" className={`btn-primary ${smallBtn}`} onClick={() => setEditing('new')}>Add coupon</button>
            </PageHeader>
            <p className="mt-2 text-sm">Coupons are checked and applied by the server at checkout. Deactivate instead of deleting, to keep usage history.</p>
            <div className="mt-2"><ErrorLine message={toggle.error} /></div>

            {editing === 'new' && <div className="mt-4 border border-maroon/20 p-4"><CouponForm onDone={done} onCancel={() => setEditing(null)} /></div>}

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">No coupons yet.</p>
                        : (
                            <ul className="mt-4 divide-y divide-maroon/15 border border-maroon/20">
                                {data.map((c) => (
                                    <li key={c.id} className="p-4 text-sm">
                                        {editing === c.id ? <CouponForm coupon={c} onDone={done} onCancel={() => setEditing(null)} /> : (
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="font-medium">{c.code} {c.is_active ? <Badge tone="good">Active</Badge> : <Badge>Inactive</Badge>}</p>
                                                    <p>
                                                        {c.discount_type === 'percentage' ? `${c.discount_value}% off` : `${formatBDT(c.discount_value)} off`}
                                                        {Number(c.min_order_amount) > 0 && ` · min ${formatBDT(c.min_order_amount)}`}
                                                        {c.max_discount_amount && ` · max ${formatBDT(c.max_discount_amount)}`}
                                                    </p>
                                                    <p className="opacity-70">
                                                        Used {c.used_count}{c.usage_limit ? ` of ${c.usage_limit}` : ''} · {c.per_customer_limit} per customer
                                                        {c.expires_at && ` · ends ${formatDhakaDate(c.expires_at)}`}
                                                    </p>
                                                </div>
                                                <div className="flex gap-4">
                                                    <button type="button" className="underline" onClick={() => setEditing(c.id)}>Edit</button>
                                                    <button type="button" className="underline" disabled={toggle.busy} onClick={() => toggleActive(c)}>{c.is_active ? 'Deactivate' : 'Activate'}</button>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
        </section>
    )
}