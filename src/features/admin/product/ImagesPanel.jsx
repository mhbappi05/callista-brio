import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, GripVertical, UploadCloud } from 'lucide-react'
import { Badge, ErrorLine, inputClass, smallBtn, useAction } from '../ui.jsx'
import {
    deleteProductImage, reorderProductImages, updateImageAlt, uploadProductImage,
} from '@/services/adminCatalogService'
import { adminErrorMessage } from '@/services/adminErrors'
import { filterImageFiles, fitToLimit } from '@/lib/imageUpload'
import { productImageUrl } from '@/lib/storageUrls'
import { sortImages } from '@/utils/images'
import { moveBy, moveItem, moveToFront } from '@/utils/reorder'

const MAX_IMAGES = 10
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif'

const isFileDrag = (e) => Array.from(e.dataTransfer?.types ?? []).includes('Files')

const STATUS_TEXT = { waiting: 'Waiting…', uploading: 'Uploading…', done: 'Done', failed: 'Failed' }

export default function ImagesPanel({ product, onChanged }) {
    const byId = new Map(product.images.map((i) => [i.id, i]))
    const [order, setOrder] = useState(() => sortImages(product.images).map((i) => i.id))
    const [dragId, setDragId] = useState(null)
    const [overId, setOverId] = useState(null)
    const [zoneOver, setZoneOver] = useState(false)
    const [queue, setQueue] = useState([])
    const [uploading, setUploading] = useState(false)
    const [notice, setNotice] = useState('')
    const inputRef = useRef(null)
    const { busy, error, run } = useAction()
    const locked = busy || uploading

    useEffect(() => {
        setOrder(sortImages(product.images).map((i) => i.id))
    }, [product.images])

    async function addFiles(fileList) {
        const { accepted, rejected } = filterImageFiles(fileList)
        const { take, skipped } = fitToLimit(accepted, order.length, MAX_IMAGES)

        const notes = []
        if (rejected.length) notes.push(`${rejected.length} file${rejected.length === 1 ? '' : 's'} skipped: only JPG, PNG, WebP or AVIF images are allowed.`)
        if (skipped) notes.push(`A product can have ${MAX_IMAGES} photos, so ${skipped} ${skipped === 1 ? 'was' : 'were'} skipped.`)
        setNotice(notes.join(' '))
        if (!take.length) return

        const items = take.map((f, i) => ({ id: `${Date.now()}-${i}`, name: f.name, status: 'waiting', message: '' }))
        const mark = (id, status, message = '') =>
            setQueue((q) => q.map((x) => (x.id === id ? { ...x, status, message } : x)))

        setQueue(items)
        setUploading(true)

        // One at a time, so the photo order stays predictable.
        let nextOrder = order.length
        let makeMain = order.length === 0
        let added = 0
        for (let i = 0; i < take.length; i += 1) {
            mark(items[i].id, 'uploading')
            try {
                await uploadProductImage(product.id, take[i], `${product.name} – photo ${nextOrder + 1}`, nextOrder, makeMain)
                nextOrder += 1
                makeMain = false
                added += 1
                mark(items[i].id, 'done')
            } catch (err) {
                console.error(err)
                mark(items[i].id, 'failed', adminErrorMessage(err))
            }
        }

        setUploading(false)
        if (added) onChanged()
    }

    async function commitOrder(next) {
        if (next === order) return
        const previous = order
        setOrder(next)
        const r = await run(() => reorderProductImages(product.id, next))
        if (r.ok) onChanged()
        else setOrder(previous)
    }

    async function act(fn) {
        const r = await run(fn)
        if (r.ok) onChanged()
    }

    const items = order.map((id) => byId.get(id)).filter(Boolean)

    return (
        <div className="float-card p-4">
            <h2 className="font-display text-2xl text-maroon">Photos</h2>
            <p className="text-sm">
                Add up to {MAX_IMAGES}. The first photo is the main one shown in the shop. Drag photos to reorder, or use the arrow buttons.
                Photos are resized and converted to WebP automatically.
            </p>

            {items.length === 0 ? (
                <p className="mt-4 text-sm">No photos yet. The shop shows a placeholder until you add one.</p>
            ) : (
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Product photos">
                    {items.map((img, index) => (
                        <li
                            key={img.id}
                            draggable={!locked}
                            onDragStart={(e) => {
                                setDragId(img.id)
                                e.dataTransfer.effectAllowed = 'move'
                                e.dataTransfer.setData('text/plain', img.id)
                            }}
                            onDragEnd={() => { setDragId(null); setOverId(null) }}
                            onDragOver={(e) => {
                                if (dragId || isFileDrag(e)) e.preventDefault()
                                if (dragId) setOverId(img.id)
                            }}
                            onDrop={(e) => {
                                if (!dragId) {
                                    if (isFileDrag(e)) {
                                        e.preventDefault()
                                        addFiles(e.dataTransfer.files)
                                    }
                                    return
                                }
                                e.preventDefault()
                                const from = order.indexOf(dragId)
                                const to = order.indexOf(img.id)
                                setDragId(null)
                                setOverId(null)
                                commitOrder(moveItem(order, from, to))
                            }}
                            className={`space-y-2 rounded-2xl bg-white p-2 text-sm shadow-float transition ${dragId === img.id ? 'opacity-40' : ''
                                } ${overId === img.id && dragId !== img.id ? 'ring-2 ring-gold' : ''}`}
                        >
                            <div className="relative">
                                <img src={productImageUrl(img.storage_path)} alt={img.alt_text} loading="lazy"
                                    className="aspect-square w-full rounded-xl object-cover" />
                                <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-cream/90 px-2 py-1 text-xs text-maroon shadow-float">
                                    <GripVertical size={14} aria-hidden="true" /> {index + 1}
                                </span>
                                {index === 0 && <span className="absolute bottom-2 left-2"><Badge tone="good">Main photo</Badge></span>}
                            </div>

                            <label className="block">Alt text
                                <input key={`${img.id}-${img.alt_text}`} className={inputClass} defaultValue={img.alt_text} maxLength={160} disabled={locked}
                                    onBlur={(e) => {
                                        const value = e.target.value.trim()
                                        if (value && value !== img.alt_text) act(() => updateImageAlt(img.id, value))
                                    }} />
                            </label>

                            <div className="flex flex-wrap items-center gap-1">
                                <button type="button" className="rounded-full border border-maroon/40 p-1.5 disabled:opacity-40"
                                    aria-label={`Move photo ${index + 1} earlier`} disabled={locked || index === 0}
                                    onClick={() => commitOrder(moveBy(order, img.id, -1))}>
                                    <ArrowLeft size={14} aria-hidden="true" />
                                </button>
                                <button type="button" className="rounded-full border border-maroon/40 p-1.5 disabled:opacity-40"
                                    aria-label={`Move photo ${index + 1} later`} disabled={locked || index === items.length - 1}
                                    onClick={() => commitOrder(moveBy(order, img.id, 1))}>
                                    <ArrowRight size={14} aria-hidden="true" />
                                </button>
                                {index !== 0 && (
                                    <button type="button" className="underline disabled:opacity-40" disabled={locked}
                                        onClick={() => commitOrder(moveToFront(order, img.id))}>Make main photo</button>
                                )}
                                <button type="button" className="ml-auto underline disabled:opacity-40" disabled={locked}
                                    onClick={() => { if (window.confirm('Delete this photo?')) act(() => deleteProductImage(img)) }}>Delete</button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}

            <label
                onDragOver={(e) => { if (isFileDrag(e)) { e.preventDefault(); setZoneOver(true) } }}
                onDragLeave={() => setZoneOver(false)}
                onDrop={(e) => {
                    if (!isFileDrag(e)) return
                    e.preventDefault()
                    setZoneOver(false)
                    addFiles(e.dataTransfer.files)
                }}
                className={`mt-5 flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center text-sm transition focus-within:ring-2 focus-within:ring-maroon ${zoneOver ? 'border-maroon bg-blush' : 'border-maroon/40 bg-blush/30 hover:bg-blush/60'
                    } ${locked || items.length >= MAX_IMAGES ? 'pointer-events-none opacity-60' : ''}`}
            >
                <UploadCloud size={32} className="text-maroon" aria-hidden="true" />
                <span className="font-medium text-maroon">Drop photos here, or click to choose</span>
                <span className="opacity-80">You can select several at once (hold Ctrl or Shift). {items.length}/{MAX_IMAGES} used.</span>
                <input ref={inputRef} type="file" accept={ACCEPT} multiple className="sr-only" disabled={locked || items.length >= MAX_IMAGES}
                    onChange={(e) => {
                        addFiles(e.target.files)
                        e.target.value = ''
                    }} />
            </label>

            {notice && <p role="status" className="mt-3 text-sm text-maroon">{notice}</p>}
            {queue.length > 0 && (
                <div className="mt-3 text-sm" aria-live="polite">
                    <ul className="divide-y divide-maroon/15 rounded-xl bg-white p-2 shadow-float">
                        {queue.map((q) => (
                            <li key={q.id} className="flex justify-between gap-3 py-1">
                                <span className="truncate">{q.name}</span>
                                <span className={q.status === 'failed' ? 'text-maroon' : ''}>{q.status === 'failed' && q.message ? q.message : STATUS_TEXT[q.status]}</span>
                            </li>
                        ))}
                    </ul>
                    {!uploading && <button type="button" className="mt-2 underline" onClick={() => setQueue([])}>Dismiss</button>}
                </div>
            )}
            <div className="mt-3"><ErrorLine message={error} /></div>
        </div>
    )
}