import { useState } from 'react'
import { Badge, ErrorLine, inputClass, smallBtn, useAction } from '../ui.jsx'
import { adjustStock, saveVariant } from '@/services/adminCatalogService'
import { formatBDT } from '@/utils/currency'

function VariantForm({ product, variant, onDone, onCancel }) {
    const [v, setV] = useState({
        name: variant?.name ?? '', sku: variant?.sku ?? '',
        price: variant?.price == null ? '' : String(variant.price),
        is_active: variant?.is_active ?? true, initial_stock: '0',
    })
    const { busy, error, setError, run } = useAction()
    const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

    async function submit(e) {
        e.preventDefault()
        if (!v.name.trim()) return setError('Enter an option name, e.g. “Rose”.')
        if (v.price !== '' && !(Number(v.price) >= 0)) return setError('Enter a valid price, or leave it empty.')
        const stock = Number(v.initial_stock)
        if (!variant && (!Number.isInteger(stock) || stock < 0)) return setError('Starting stock must be a whole number.')

        const r = await run(async () => {
            const id = await saveVariant(variant?.id ?? null, {
                ...(variant ? {} : { product_id: product.id }),
                name: v.name.trim(), sku: v.sku.trim() || null,
                price: v.price === '' ? null : Number(v.price), is_active: v.is_active,
            })
            if (!variant && stock > 0) {
                try {
                    await adjustStock({ productId: product.id, variantId: id, change: stock, reason: 'initial_stock' })
                } catch (err) {
                    console.error(err)
                }
            }
        })
        if (r.ok) onDone()
    }

    return (
        <form onSubmit={submit} className="grid gap-3 text-sm sm:grid-cols-2">
            <label>Option name *<input className={inputClass} value={v.name} onChange={set('name')} maxLength={120} /></label>
            <label>SKU (optional)<input className={inputClass} value={v.sku} onChange={set('sku')} /></label>
            <label>Price override (৳, optional)
                <input type="number" min="0" step="0.01" className={inputClass} value={v.price} onChange={set('price')} />
            </label>
            {!variant && (
                <label>Starting stock<input type="number" min="0" className={inputClass} value={v.initial_stock} onChange={set('initial_stock')} /></label>
            )}
            <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Available in the store
            </label>
            <div className="space-y-2 sm:col-span-2">
                <ErrorLine message={error} />
                <div className="flex gap-2">
                    <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : variant ? 'Save option' : 'Add option'}</button>
                    {onCancel && <button type="button" className={`btn-secondary ${smallBtn}`} onClick={onCancel}>Cancel</button>}
                </div>
            </div>
        </form>
    )
}

export default function VariantsPanel({ product, onChanged }) {
    const [editing, setEditing] = useState(null) // null | 'new' | variant id

    if (!product.has_variants) {
        return (
            <div className="border border-maroon/20 p-4">
                <h2 className="font-display text-2xl text-maroon">Options</h2>
                <p className="mt-2 text-sm">This product has no options. To sell colours or sizes, tick “This product has options” above and save.</p>
            </div>
        )
    }

    const done = () => { setEditing(null); onChanged() }

    return (
        <div className="border border-maroon/20 p-4">
            <h2 className="font-display text-2xl text-maroon">Options</h2>
            <ul className="mt-3 divide-y divide-maroon/15">
                {product.variants.map((v) => (
                    <li key={v.id} className="py-3 text-sm">
                        {editing === v.id ? (
                            <VariantForm product={product} variant={v} onDone={done} onCancel={() => setEditing(null)} />
                        ) : (
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p>
                                    <strong>{v.name}</strong>{v.sku ? ` · ${v.sku}` : ''}
                                    {v.price != null && ` · ${formatBDT(v.price)}`} · {v.stock_quantity} in stock{' '}
                                    {!v.is_active && <Badge>Hidden</Badge>}
                                </p>
                                <button type="button" className="underline" onClick={() => setEditing(v.id)}>Edit</button>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
            {product.variants.length === 0 && <p className="mt-2 text-sm text-maroon">No options yet. Customers can’t buy this product until you add one.</p>}

            {editing === 'new' ? (
                <div className="mt-4 border-t border-maroon/20 pt-4">
                    <VariantForm product={product} onDone={done} onCancel={() => setEditing(null)} />
                </div>
            ) : (
                <button type="button" className={`btn-secondary mt-4 ${smallBtn}`} onClick={() => setEditing('new')}>Add an option</button>
            )}
            <p className="mt-3 text-xs opacity-70">Change stock for an option in the Stock panel below.</p>
        </div>
    )
}