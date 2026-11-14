import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { ErrorLine, inputClass, useAction } from '../ui.jsx'
import { adjustStock, saveProduct } from '@/services/adminCatalogService'
import { SLUG_RE, slugify } from '@/utils/slug'

const EMPTY = {
    name: '', slug: '', category_id: '', collection_id: '', description: '', story: '', material: '',
    color: '', dimensions: '', weight_grams: '', care_instructions: '', sku: '', price: '',
    discount_price: '', has_variants: false, low_stock_threshold: '3', is_featured: false,
    is_active: true, initial_stock: '0',
}

const str = (v) => (v == null ? '' : String(v))
const nul = (s) => s.trim() || null

function toForm(p) {
    if (!p) return EMPTY
    return {
        ...EMPTY,
        name: p.name, slug: p.slug, category_id: p.category_id ?? '', collection_id: p.collection_id ?? '',
        description: p.description ?? '', story: p.story ?? '', material: p.material ?? '', color: p.color ?? '',
        dimensions: p.dimensions ?? '', weight_grams: str(p.weight_grams), care_instructions: p.care_instructions ?? '',
        sku: p.sku ?? '', price: str(p.price), discount_price: str(p.discount_price),
        has_variants: p.has_variants, low_stock_threshold: str(p.low_stock_threshold),
        is_featured: p.is_featured, is_active: p.is_active,
    }
}

export default function ProductForm({ product, categories, collections, onSaved }) {
    const isNew = !product
    const [v, setV] = useState(() => toForm(product))
    const [slugTouched, setSlugTouched] = useState(!isNew)
    const [errors, setErrors] = useState({})
    const [saved, setSaved] = useState(false)
    const { busy, error, run } = useAction()

    const set = (key) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setSaved(false)
        setV((cur) => {
            const next = { ...cur, [key]: value }
            if (key === 'name' && !slugTouched) next.slug = slugify(value)
            return next
        })
    }

    function validate() {
        const e = {}
        if (!v.name.trim()) e.name = 'Enter a product name.'
        if (!SLUG_RE.test(v.slug)) e.slug = 'Use lowercase letters, numbers and single hyphens, e.g. pearl-drop-earrings.'
        const price = Number(v.price)
        if (v.price === '' || !Number.isFinite(price) || price < 0) e.price = 'Enter a valid price.'
        if (v.discount_price !== '') {
            const d = Number(v.discount_price)
            if (!Number.isFinite(d) || d < 0 || d >= price) e.discount_price = 'The sale price must be lower than the price.'
        }
        if (!Number.isInteger(Number(v.low_stock_threshold)) || Number(v.low_stock_threshold) < 0) {
            e.low_stock_threshold = 'Enter a whole number (0 or more).'
        }
        if (isNew && (!Number.isInteger(Number(v.initial_stock)) || Number(v.initial_stock) < 0)) {
            e.initial_stock = 'Enter a whole number (0 or more).'
        }
        if (v.weight_grams !== '' && !(Number(v.weight_grams) >= 0)) e.weight_grams = 'Enter a valid weight.'
        return e
    }

    async function submit(ev) {
        ev.preventDefault()
        const found = validate()
        setErrors(found)
        if (Object.keys(found).length) return

        const payload = {
            name: v.name.trim(), slug: v.slug.trim(),
            category_id: v.category_id || null, collection_id: v.collection_id || null,
            description: nul(v.description), story: nul(v.story), material: nul(v.material), color: nul(v.color),
            dimensions: nul(v.dimensions), care_instructions: nul(v.care_instructions), sku: nul(v.sku),
            weight_grams: v.weight_grams === '' ? null : Number(v.weight_grams),
            price: Number(v.price),
            discount_price: v.discount_price === '' ? null : Number(v.discount_price),
            has_variants: v.has_variants, low_stock_threshold: Number(v.low_stock_threshold),
            is_featured: v.is_featured, is_active: v.is_active,
        }

        const r = await run(async () => {
            const id = await saveProduct(product?.id ?? null, payload)
            const stock = Number(v.initial_stock)
            if (isNew && !payload.has_variants && stock > 0) {
                try {
                    await adjustStock({ productId: id, change: stock, reason: 'initial_stock' })
                } catch (err) {
                    console.error(err) // The product exists; stock can be set in the Stock panel.
                }
            }
            return id
        })
        if (r.ok) {
            setSaved(true)
            onSaved(r.value)
        }
    }

    const aria = (k) => ({ 'aria-invalid': !!errors[k], 'aria-describedby': errors[k] ? `pf-${k}-error` : undefined })

    return (
        <form onSubmit={submit} noValidate className="grid gap-4 border border-maroon/20 p-4 sm:grid-cols-2">
            <h2 className="font-display text-2xl text-maroon sm:col-span-2">Product details</h2>

            <Field id="pf-name" label="Name *" error={errors.name}>
                <input id="pf-name" className={inputClass} value={v.name} onChange={set('name')} maxLength={160} {...aria('name')} />
            </Field>
            <Field id="pf-slug" label="URL name (slug) *" error={errors.slug} hint="Part of the product link. Changing it later breaks old links.">
                <input id="pf-slug" className={inputClass} value={v.slug} {...aria('slug')}
                    onChange={(e) => { setSlugTouched(true); set('slug')(e) }} />
            </Field>

            <Field id="pf-category" label="Category">
                <select id="pf-category" className={inputClass} value={v.category_id} onChange={set('category_id')}>
                    <option value="">None</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (hidden)'}</option>)}
                </select>
            </Field>
            <Field id="pf-collection" label="Collection">
                <select id="pf-collection" className={inputClass} value={v.collection_id} onChange={set('collection_id')}>
                    <option value="">None</option>
                    {collections.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? '' : ' (hidden)'}</option>)}
                </select>
            </Field>

            <Field id="pf-price" label="Price (৳) *" error={errors.price}>
                <input id="pf-price" type="number" min="0" step="0.01" className={inputClass} value={v.price} onChange={set('price')} {...aria('price')} />
            </Field>
            <Field id="pf-discount" label="Sale price (৳, optional)" error={errors.discount_price} hint="Leave empty for no sale.">
                <input id="pf-discount" type="number" min="0" step="0.01" className={inputClass} value={v.discount_price} onChange={set('discount_price')} {...aria('discount_price')} />
            </Field>

            <div className="sm:col-span-2">
                <Field id="pf-description" label="Description">
                    <textarea id="pf-description" rows={3} className={inputClass} value={v.description} onChange={set('description')} />
                </Field>
            </div>
            <div className="sm:col-span-2">
                <Field id="pf-story" label="Story (optional)">
                    <textarea id="pf-story" rows={3} className={inputClass} value={v.story} onChange={set('story')} />
                </Field>
            </div>

            <Field id="pf-material" label="Material"><input id="pf-material" className={inputClass} value={v.material} onChange={set('material')} /></Field>
            <Field id="pf-color" label="Color"><input id="pf-color" className={inputClass} value={v.color} onChange={set('color')} /></Field>
            <Field id="pf-dimensions" label="Dimensions"><input id="pf-dimensions" className={inputClass} value={v.dimensions} onChange={set('dimensions')} /></Field>
            <Field id="pf-weight" label="Weight (grams)" error={errors.weight_grams}>
                <input id="pf-weight" type="number" min="0" step="0.01" className={inputClass} value={v.weight_grams} onChange={set('weight_grams')} {...aria('weight_grams')} />
            </Field>
            <div className="sm:col-span-2">
                <Field id="pf-care" label="Care instructions">
                    <textarea id="pf-care" rows={2} className={inputClass} value={v.care_instructions} onChange={set('care_instructions')} />
                </Field>
            </div>

            <Field id="pf-sku" label="SKU (optional)"><input id="pf-sku" className={inputClass} value={v.sku} onChange={set('sku')} /></Field>
            <Field id="pf-low" label="Low-stock warning at" error={errors.low_stock_threshold}>
                <input id="pf-low" type="number" min="0" className={inputClass} value={v.low_stock_threshold} onChange={set('low_stock_threshold')} {...aria('low_stock_threshold')} />
            </Field>

            {isNew && !v.has_variants && (
                <Field id="pf-initial_stock" label="Starting stock" error={errors.initial_stock}>
                    <input id="pf-initial_stock" type="number" min="0" className={inputClass} value={v.initial_stock} onChange={set('initial_stock')} {...aria('initial_stock')} />
                </Field>
            )}

            <div className="space-y-2 text-sm sm:col-span-2">
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={v.has_variants} onChange={set('has_variants')} />
                    This product has options (such as colours). Stock is then tracked per option.
                </label>
                {v.has_variants && !isNew && Number(product?.stock_quantity) > 0 && (
                    <p className="text-maroon">The product-level stock ({product.stock_quantity}) will be ignored once options are on.</p>
                )}
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={v.is_featured} onChange={set('is_featured')} /> Featured on the home page
                </label>
                <label className="flex items-center gap-2">
                    <input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Visible in the store
                </label>
            </div>

            <div className="space-y-2 sm:col-span-2">
                <ErrorLine message={error} />
                {saved && <p role="status" className="text-sm">Saved.</p>}
                <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create product' : 'Save changes'}</button>
            </div>
        </form>
    )
}