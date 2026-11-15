import { useRef, useState } from 'react'
import { Badge, ErrorLine, inputClass, smallBtn, useAction } from '../ui.jsx'
import {
    deleteProductImage, setPrimaryImage, updateImageAlt, uploadProductImage,
} from '@/services/adminCatalogService'
import { productImageUrl } from '@/lib/storageUrls'
import { sortImages } from '@/utils/images'

export default function ImagesPanel({ product, onChanged }) {
    const images = sortImages(product.images)
    const [file, setFile] = useState(null)
    const [alt, setAlt] = useState('')
    const fileRef = useRef(null)
    const { busy, error, setError, run } = useAction()

    async function upload(e) {
        e.preventDefault()
        if (!file) {
            setError('Choose an image first.')
            return
        }
        if (!alt.trim()) {
            setError('Describe the image briefly. This helps screen-reader users and search engines.')
            return
        }
        const r = await run(() => uploadProductImage(product.id, file, alt.trim(), images.length, images.length === 0))
        if (r.ok) {
            setFile(null)
            setAlt('')
            if (fileRef.current) fileRef.current.value = ''
            onChanged()
        }
    }

    async function act(fn) {
        const r = await run(fn)
        if (r.ok) onChanged()
    }

    return (
        <div className="float-card p-4">
            <h2 className="font-display text-2xl text-maroon">Images</h2>
            <p className="text-sm">The first (primary) image is shown on product cards. JPG, PNG, WebP or AVIF, up to 5 MB.</p>

            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                    <li key={img.id} className="space-y-2 float-card p-2 text-sm">
                        <img src={productImageUrl(img.storage_path)} alt={img.alt_text} className="aspect-square w-full object-cover" />
                        {img.is_primary && <Badge tone="good">Primary</Badge>}
                        <label className="block">Alt text
                            <input className={inputClass} defaultValue={img.alt_text} maxLength={160}
                                onBlur={(e) => {
                                    const value = e.target.value.trim()
                                    if (value && value !== img.alt_text) act(() => updateImageAlt(img.id, value))
                                }} />
                        </label>
                        <div className="flex gap-3">
                            {!img.is_primary && (
                                <button type="button" className="underline" disabled={busy} onClick={() => act(() => setPrimaryImage(product.id, img.id))}>Make primary</button>
                            )}
                            <button type="button" className="underline" disabled={busy}
                                onClick={() => { if (window.confirm('Delete this image?')) act(() => deleteProductImage(img)) }}>Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
            {images.length === 0 && <p className="mt-3 text-sm">No images yet. The store shows a placeholder.</p>}

            <form onSubmit={upload} className="mt-6 space-y-3 text-sm">
                <label className="block">Add an image
                    <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="mt-1 block"
                        onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </label>
                <label className="block">Alt text (describe the image)
                    <input className={inputClass} value={alt} maxLength={160} onChange={(e) => setAlt(e.target.value)} />
                </label>
                <ErrorLine message={error} />
                <button type="submit" className={`btn-primary ${smallBtn}`} disabled={busy}>{busy ? 'Working…' : 'Upload image'}</button>
            </form>
        </div>
    )
}