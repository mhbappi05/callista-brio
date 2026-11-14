import { useState } from 'react'
import { ErrorLine, inputClass, smallBtn, useAction } from '../ui.jsx'
import { adjustStock, listInventoryLogs } from '@/services/adminCatalogService'
import { useAsync } from '@/hooks/useAsync'
import { formatDhakaDate } from '@/utils/orderLabels'

const REASONS = {
    manual_adjustment: 'Manual adjustment',
    return_restock: 'Return restocked',
    correction: 'Stock count correction',
    initial_stock: 'Initial stock',
}
const LOG_REASONS = {
    ...REASONS,
    order_placed: 'Order placed',
    order_cancelled: 'Order cancelled',
}

export default function StockPanel({ product, onChanged }) {
    const variants = product.variants ?? []
    const [variantId, setVariantId] = useState(variants[0]?.id ?? '')
    const [change, setChange] = useState('')
    const [reason, setReason] = useState('manual_adjustment')
    const [note, setNote] = useState('')
    const [nonce, setNonce] = useState(0)
    const [done, setDone] = useState('')
    const { busy, error, setError, run } = useAction()
    const logs = useAsync(() => listInventoryLogs(product.id), [product.id, nonce])

    const target = product.has_variants ? variants.find((x) => x.id === variantId) : null
    const current = product.has_variants ? target?.stock_quantity : product.stock_quantity
    const nameOf = (id) => variants.find((x) => x.id === id)?.name

    async function submit(e) {
        e.preventDefault()
        setDone('')
        const n = Number(change)
        if (!Number.isInteger(n) || n === 0) {
            setError('Enter a whole number that is not zero. Use a minus sign to remove stock.')
            return
        }
        if (product.has_variants && !target) {
            setError('Choose an option first.')
            return
        }
        if (current + n < 0) {
            setError(`Stock can’t go below zero. Current stock is ${current}.`)
            return
        }
        const r = await run(() =>
            adjustStock({ productId: product.id, variantId: product.has_variants ? variantId : null, change: n, reason, note: note.trim() })
        )
        if (r.ok) {
            setDone(`Stock is now ${r.value}.`)
            setChange('')
            setNote('')
            setNonce((x) => x + 1)
            onChanged()
        }
    }

    return (
        <div className="border border-maroon/20 p-4">
            <h2 className="font-display text-2xl text-maroon">Stock</h2>
            <p className="text-sm">Every change is recorded below with who made it.</p>

            {product.has_variants && variants.length === 0 ? (
                <p className="mt-3 text-sm">Add an option first.</p>
            ) : (
                <form onSubmit={submit} className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    {product.has_variants && (
                        <label>Option
                            <select className={inputClass} value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                                {variants.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.stock_quantity} in stock)</option>)}
                            </select>
                        </label>
                    )}
                    {!product.has_variants && <p className="self-end">Current stock: <strong>{product.stock_quantity}</strong></p>}
                    <label>Change (+ add, − remove)
                        <input className={inputClass} inputMode="numeric" placeholder="e.g. 10 or -2" value={change} onChange={(e) => setChange(e.target.value)} />
                    </label>
                    <label>Reason
                        <select className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)}>
                            {Object.entries(REASONS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                        </select>
                    </label>
                    <label>Note (optional)
                        <input className={inputClass} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
                    </label>
                    <div className="space-y-2 sm:col-span-2">
                        <ErrorLine message={error} />
                        {done && <p role="status">{done}</p>}
                        <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Apply change'}</button>
                    </div>
                </form>
            )}

            <h3 className="mt-6 text-lg font-medium">Recent changes</h3>
            {logs.data?.length ? (
                <ul className="mt-2 divide-y divide-maroon/15 text-sm">
                    {logs.data.map((l) => (
                        <li key={l.id} className="flex justify-between gap-3 py-1">
                            <span>
                                {l.quantity_change > 0 ? `+${l.quantity_change}` : l.quantity_change} · {LOG_REASONS[l.reason] ?? l.reason}
                                {l.variant_id && nameOf(l.variant_id) ? ` · ${nameOf(l.variant_id)}` : ''}{l.note ? ` · ${l.note}` : ''}
                            </span>
                            <span className="opacity-70">{formatDhakaDate(l.created_at)}</span>
                        </li>
                    ))}
                </ul>
            ) : <p className="mt-2 text-sm">No stock changes recorded yet.</p>}
        </div>
    )
}