import { useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listTaxonomy, saveTaxonomy, uploadBanner } from '@/services/adminCatalogService'
import { bannerImageUrl } from '@/lib/storageUrls'
import { SLUG_RE, slugify } from '@/utils/slug'

function TaxForm({ table, item, onDone, onCancel }) {
    const isCollection = table === 'collections'
    const [v, setV] = useState({
        name: item?.name ?? '', slug: item?.slug ?? '', description: item?.description ?? '',
        display_order: String(item?.display_order ?? 0), is_active: item?.is_active ?? true,
        is_featured: item?.is_featured ?? false,
    })
    const [slugTouched, setSlugTouched] = useState(Boolean(item))
    const [file, setFile] = useState(null)
    const [errors, setErrors] = useState({})
    const { busy, error, run } = useAction()

    const set = (k) => (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
        setV((cur) => {
            const next = { ...cur, [k]: value }
            if (k === 'name' && !slugTouched) next.slug = slugify(value)
            return next
        })
    }

    async function submit(e) {
        e.preventDefault()
        const found = {}
        if (!v.name.trim()) found.name = 'Enter a name.'
        if (!SLUG_RE.test(v.slug)) found.slug = 'Use lowercase letters, numbers and single hyphens.'
        if (!Number.isInteger(Number(v.display_order))) found.display_order = 'Enter a whole number.'
        setErrors(found)
        if (Object.keys(found).length) return

        const payload = {
            name: v.name.trim(), slug: v.slug, description: v.description.trim() || null,
            display_order: Number(v.display_order), is_active: v.is_active,
            ...(isCollection ? { is_featured: v.is_featured } : {}),
        }
        const r = await run(async () => {
            const id = await saveTaxonomy(table, item?.id ?? null, payload)
            if (isCollection && file) {
                const path = await uploadBanner(id, file)
                await saveTaxonomy(table, id, { banner_path: path })
            }
        })
        if (r.ok) onDone()
    }

    return (
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
            <Field id="tx-name" label="Name *" error={errors.name}>
                <input id="tx-name" className={inputClass} value={v.name} onChange={set('name')} maxLength={80} />
            </Field>
            <Field id="tx-slug" label="URL name (slug) *" error={errors.slug}>
                <input id="tx-slug" className={inputClass} value={v.slug} onChange={(e) => { setSlugTouched(true); set('slug')(e) }} />
            </Field>
            <div className="sm:col-span-2">
                <Field id="tx-desc" label="Description">
                    <textarea id="tx-desc" rows={2} className={inputClass} value={v.description} onChange={set('description')} />
                </Field>
            </div>
            <Field id="tx-order" label="Display order (lower comes first)" error={errors.display_order}>
                <input id="tx-order" type="number" className={inputClass} value={v.display_order} onChange={set('display_order')} />
            </Field>
            {isCollection && (
                <label className="text-sm">Banner image (optional, up to 5 MB)
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
            )}
            <div className="space-y-1 text-sm sm:col-span-2">
                <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Visible in the store</label>
                {isCollection && (
                    <label className="flex items-center gap-2"><input type="checkbox" checked={v.is_featured} onChange={set('is_featured')} /> Featured</label>
                )}
            </div>
            <div className="space-y-2 sm:col-span-2">
                <ErrorLine message={error} />
                <div className="flex gap-2">
                    <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
                    <button type="button" className={`btn-secondary ${smallBtn}`} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </form>
    )
}

export default function AdminTaxonomy({ table }) {
    const label = table === 'categories' ? 'Categories' : 'Collections'
    useDocumentTitle(`${label} (admin)`)
    const { data, error, loading, reload } = useAsync(() => listTaxonomy(table), [table])
    const [editing, setEditing] = useState(null) // null | 'new' | id
    const toggle = useAction()

    const done = () => { setEditing(null); reload() }

    async function toggleActive(item) {
        const r = await toggle.run(() => saveTaxonomy(table, item.id, { is_active: !item.is_active }))
        if (r.ok) reload()
    }

    return (
        <section>
            <PageHeader title={label}>
                <button type="button" className={`btn-primary ${smallBtn}`} onClick={() => setEditing('new')}>Add</button>
            </PageHeader>
            <p className="mt-2 text-sm">Items are hidden rather than deleted, so products linked to them are not affected.</p>
            <div className="mt-2"><ErrorLine message={toggle.error} /></div>

            {editing === 'new' && (
                <div className="mt-4 float-card p-4"><TaxForm key="new" table={table} onDone={done} onCancel={() => setEditing(null)} /></div>
            )}

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
                    : (
                        <ul className="mt-4 divide-y divide-maroon/15 float-card">
                            {data?.map((item) => (
                                <li key={item.id} className="p-4 text-sm">
                                    {editing === item.id ? (
                                        <TaxForm table={table} item={item} onDone={done} onCancel={() => setEditing(null)} />
                                    ) : (
                                        <div className="flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                {table === 'collections' && bannerImageUrl(item.banner_path) && (
                                                    <img src={bannerImageUrl(item.banner_path)} alt="" className="h-12 w-16 object-cover" />
                                                )}
                                                <div>
                                                    <p className="font-medium">{item.name} <span className="opacity-60">/{item.slug}</span></p>
                                                    <p className="space-x-1">
                                                        {item.is_active ? <Badge tone="good">Visible</Badge> : <Badge>Hidden</Badge>}
                                                        {item.is_featured && <Badge tone="warn">Featured</Badge>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <button type="button" className="underline" onClick={() => setEditing(item.id)}>Edit</button>
                                                <button type="button" className="underline" disabled={toggle.busy} onClick={() => toggleActive(item)}>
                                                    {item.is_active ? 'Hide' : 'Show'}
                                                </button>
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