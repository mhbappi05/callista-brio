import { useEffect, useState } from 'react'
import Field from '@/components/common/Field.jsx'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { homeBannerUrl } from '@/lib/storageUrls'
import {
    deleteBanner, listBanners, removeBannerFile, saveBanner, uploadBannerImage,
} from '@/services/adminBannerService'
import { bannerStatus, validateCtaUrl } from '@/utils/banners'
import { formatDhakaDate } from '@/utils/orderLabels'
import { fromLocalInput, toLocalInput } from '@/utils/slug'

const STATUS = { live: ['Live now', 'good'], scheduled: ['Scheduled', 'warn'], expired: ['Ended', 'default'], hidden: ['Hidden', 'default'] }

function BannerForm({ banner, onDone, onCancel }) {
    const [v, setV] = useState({
        kind: banner?.kind ?? 'offer', title: banner?.title ?? '', subtitle: banner?.subtitle ?? '',
        cta_label: banner?.cta_label ?? '', cta_url: banner?.cta_url ?? '',
        starts_at: toLocalInput(banner?.starts_at), ends_at: toLocalInput(banner?.ends_at),
        display_order: String(banner?.display_order ?? 0), is_active: banner?.is_active ?? true,
    })
    const [file, setFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [removeImage, setRemoveImage] = useState(false)
    const [errors, setErrors] = useState({})
    const { busy, error, run } = useAction()
    const set = (k) => (e) => setV({ ...v, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

    useEffect(() => {
        if (!file) {
            setPreview(null)
            return undefined
        }
        const url = URL.createObjectURL(file)
        setPreview(url)
        return () => URL.revokeObjectURL(url)
    }, [file])

    const existing = banner?.image_path && !removeImage ? homeBannerUrl(banner.image_path) : null

    async function submit(e) {
        e.preventDefault()
        const f = {}
        const label = v.cta_label.trim()
        const url = v.cta_url.trim()
        if (!v.title.trim()) f.title = 'Enter a headline.'
        if (Boolean(label) !== Boolean(url)) f.cta_label = 'Fill in both the button text and the link, or leave both empty.'
        else if (url && !validateCtaUrl(url)) f.cta_url = 'Use a page on your site such as /shop, or a full link starting with https://.'
        if (v.starts_at && v.ends_at && new Date(v.starts_at) >= new Date(v.ends_at)) f.ends_at = 'The end must be after the start.'
        if (!Number.isInteger(Number(v.display_order))) f.display_order = 'Enter a whole number.'
        setErrors(f)
        if (Object.keys(f).length) return

        const r = await run(async () => {
            const id = await saveBanner(banner?.id ?? null, {
                kind: v.kind, title: v.title.trim(), subtitle: v.subtitle.trim() || null,
                cta_label: label || null, cta_url: url || null,
                starts_at: fromLocalInput(v.starts_at), ends_at: fromLocalInput(v.ends_at),
                display_order: Number(v.display_order), is_active: v.is_active,
            })
            if (file) {
                const path = await uploadBannerImage(id, file)
                await saveBanner(id, { image_path: path })
                if (banner?.image_path) await removeBannerFile(banner.image_path)
            } else if (removeImage && banner?.image_path) {
                await saveBanner(id, { image_path: null })
                await removeBannerFile(banner.image_path)
            }
        })
        if (r.ok) onDone()
    }

    return (
        <form onSubmit={submit} noValidate className="grid gap-3 sm:grid-cols-2">
            <Field id="bn-kind" label="Type">
                <select id="bn-kind" className={inputClass} value={v.kind} onChange={set('kind')}>
                    <option value="offer">Offer</option>
                    <option value="news">News or notice</option>
                </select>
            </Field>
            <Field id="bn-title" label="Headline *" error={errors.title}>
                <input id="bn-title" className={inputClass} value={v.title} onChange={set('title')} maxLength={80} />
            </Field>
            <div className="sm:col-span-2">
                <Field id="bn-sub" label="Short text (optional)"><input id="bn-sub" className={inputClass} value={v.subtitle} onChange={set('subtitle')} maxLength={160} /></Field>
            </div>
            <Field id="bn-label" label="Button text (optional)" error={errors.cta_label}>
                <input id="bn-label" className={inputClass} value={v.cta_label} onChange={set('cta_label')} maxLength={30} placeholder="Shop now" />
            </Field>
            <Field id="bn-url" label="Button link" error={errors.cta_url} hint="For example /shop or /collections">
                <input id="bn-url" className={inputClass} value={v.cta_url} onChange={set('cta_url')} placeholder="/shop" />
            </Field>
            <Field id="bn-start" label="Show from (optional)"><input id="bn-start" type="datetime-local" className={inputClass} value={v.starts_at} onChange={set('starts_at')} /></Field>
            <Field id="bn-end" label="Show until (optional)" error={errors.ends_at}><input id="bn-end" type="datetime-local" className={inputClass} value={v.ends_at} onChange={set('ends_at')} /></Field>
            <Field id="bn-order" label="Order (lower shows first)" error={errors.display_order}>
                <input id="bn-order" type="number" className={inputClass} value={v.display_order} onChange={set('display_order')} />
            </Field>
            <label className="flex items-center gap-2 self-end text-sm">
                <input type="checkbox" checked={v.is_active} onChange={set('is_active')} /> Active
            </label>

            <div className="space-y-2 text-sm sm:col-span-2">
                <label className="block">Image (optional)
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block"
                        onChange={(e) => { setFile(e.target.files?.[0] ?? null); setRemoveImage(false) }} />
                </label>
                <p className="text-xs opacity-80">
                    Best: a wide landscape photo around 1800 × 800 px. The text sits on the left (and at the bottom on phones), so keep the main subject on the right. Large photos are shrunk automatically.
                </p>
                {(preview || existing) && <img src={preview || existing} alt="Banner preview" className="h-28 rounded-xl object-cover shadow-float" />}
                {banner?.image_path && !file && (
                    <label className="flex items-center gap-2"><input type="checkbox" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} /> Remove the current image</label>
                )}
            </div>

            <div className="space-y-2 sm:col-span-2">
                <ErrorLine message={error} />
                <div className="flex gap-2">
                    <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Saving…' : 'Save banner'}</button>
                    <button type="button" className={`btn-secondary ${smallBtn}`} onClick={onCancel}>Cancel</button>
                </div>
            </div>
        </form>
    )
}

export default function AdminBanners() {
    useDocumentTitle('Home banners (admin)')
    const { data, error, loading, reload } = useAsync(listBanners, [])
    const [editing, setEditing] = useState(null)
    const action = useAction()
    const done = () => { setEditing(null); reload() }

    async function toggle(b) {
        const r = await action.run(() => saveBanner(b.id, { is_active: !b.is_active }))
        if (r.ok) reload()
    }
    async function remove(b) {
        if (!window.confirm(`Delete “${b.title}”? This can’t be undone.`)) return
        const r = await action.run(() => deleteBanner(b))
        if (r.ok) reload()
    }

    return (
        <section>
            <PageHeader title="Home banners">
                <button type="button" className={`btn-primary ${smallBtn}`} onClick={() => setEditing('new')}>Add banner</button>
            </PageHeader>
            <p className="mt-2 text-sm">
                Banners appear in the slideshow at the top of the Home page, in the order below (up to 6). With no live banners, the store shows its default brand slides. Changes can take up to a minute to appear for visitors.
            </p>
            <div className="mt-2"><ErrorLine message={action.error} /></div>

            {editing === 'new' && <div className="float-card mt-4 p-4"><BannerForm onDone={done} onCancel={() => setEditing(null)} /></div>}

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-4" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-4">No banners yet.</p>
                        : (
                            <ul className="float-card mt-4 divide-y divide-maroon/15">
                                {data.map((b) => {
                                    const [statusLabel, tone] = STATUS[bannerStatus(b)]
                                    return (
                                        <li key={b.id} className="p-4 text-sm">
                                            {editing === b.id ? <BannerForm banner={b} onDone={done} onCancel={() => setEditing(null)} /> : (
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        {b.image_path
                                                            ? <img src={homeBannerUrl(b.image_path)} alt="" className="h-14 w-24 rounded-lg object-cover" />
                                                            : <span className="grid h-14 w-24 place-items-center rounded-lg bg-gradient-to-br from-maroon to-ink text-xs text-ink-light">No image</span>}
                                                        <div>
                                                            <p className="font-medium">{b.title}</p>
                                                            <p className="space-x-1">
                                                                <Badge tone={tone}>{statusLabel}</Badge>
                                                                <Badge>{b.kind === 'offer' ? 'Offer' : 'News'}</Badge>
                                                            </p>
                                                            {(b.starts_at || b.ends_at) && (
                                                                <p className="opacity-70">
                                                                    {b.starts_at && `From ${formatDhakaDate(b.starts_at)}`}{b.starts_at && b.ends_at && ' · '}{b.ends_at && `Until ${formatDhakaDate(b.ends_at)}`}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-4">
                                                        <button type="button" className="underline" onClick={() => setEditing(b.id)}>Edit</button>
                                                        <button type="button" className="underline" disabled={action.busy} onClick={() => toggle(b)}>{b.is_active ? 'Hide' : 'Show'}</button>
                                                        <button type="button" className="underline" disabled={action.busy} onClick={() => remove(b)}>Delete</button>
                                                    </div>
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        )}
        </section>
    )
}