import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, ErrorLine, PageHeader, inputClass, smallBtn, useAction } from '@/features/admin/ui.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { listProducts, setProductActive } from '@/services/adminCatalogService'
import { formatBDT } from '@/utils/currency'

function stockOf(p) {
    return p.has_variants
        ? p.variants.filter((v) => v.is_active).reduce((s, v) => s + v.stock_quantity, 0)
        : p.stock_quantity
}

export default function AdminProducts() {
    useDocumentTitle('Products (admin)')
    const [status, setStatus] = useState('')
    const [term, setTerm] = useState('')
    const [q, setQ] = useState('')
    const { data, error, loading, reload } = useAsync(() => listProducts({ q, status }), [q, status])
    const action = useAction()

    async function toggle(p) {
        const r = await action.run(() => setProductActive(p.id, !p.is_active))
        if (r.ok) reload()
    }

    return (
        <section>
            <PageHeader title="Products">
                <Link to="/admin/products/new" className={`btn-primary ${smallBtn}`}>Add product</Link>
            </PageHeader>

            <div className="mt-6 flex flex-wrap items-end gap-3">
                <form className="flex items-end gap-2" role="search" onSubmit={(e) => { e.preventDefault(); setQ(term) }}>
                    <label className="text-sm">Search
                        <input className={`${inputClass} w-56`} placeholder="Name or SKU" value={term} onChange={(e) => setTerm(e.target.value)} />
                    </label>
                    <button type="submit" className={`btn-secondary ${smallBtn}`}>Search</button>
                </form>
                <label className="text-sm">Show
                    <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">All products</option>
                        <option value="active">Visible in store</option>
                        <option value="inactive">Hidden</option>
                    </select>
                </label>
            </div>
            <div className="mt-3"><ErrorLine message={action.error} /></div>

            {error ? <ErrorState error={error} onRetry={reload} />
                : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
                    : !data?.length ? <p className="mt-6">No products found.</p>
                        : (
                            <div className="mt-4 overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead>
                                        <tr className="border-b border-maroon/30">
                                            <th className="py-2 pr-3">Product</th><th className="pr-3">Category</th>
                                            <th className="pr-3 text-right">Price</th><th className="pr-3 text-right">Stock</th><th>Visibility</th><th />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((p) => {
                                            const stock = stockOf(p)
                                            return (
                                                <tr key={p.id} className="border-b border-maroon/10">
                                                    <td className="py-2 pr-3">
                                                        <Link className="underline" to={`/admin/products/${p.id}`}>{p.name}</Link>
                                                        {p.has_variants && <span className="ml-2 text-xs opacity-70">has options</span>}
                                                    </td>
                                                    <td className="pr-3">{p.category?.name ?? '—'}</td>
                                                    <td className="pr-3 text-right">
                                                        {formatBDT(p.discount_price ?? p.price)}
                                                        {p.discount_price != null && <span className="ml-1 text-xs line-through opacity-60">{formatBDT(p.price)}</span>}
                                                    </td>
                                                    <td className="pr-3 text-right">
                                                        {stock <= 0 ? <Badge tone="bad">Out</Badge> : stock <= p.low_stock_threshold ? <Badge tone="warn">{stock} low</Badge> : stock}
                                                    </td>
                                                    <td>{p.is_active ? <Badge tone="good">Visible</Badge> : <Badge>Hidden</Badge>}</td>
                                                    <td className="text-right">
                                                        <button type="button" className="underline" disabled={action.busy} onClick={() => toggle(p)}>
                                                            {p.is_active ? 'Hide' : 'Show'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
        </section>
    )
}