import { Link, useNavigate, useParams } from 'react-router-dom'
import ImagesPanel from '@/features/admin/product/ImagesPanel.jsx'
import ProductForm from '@/features/admin/product/ProductForm.jsx'
import StockPanel from '@/features/admin/product/StockPanel.jsx'
import VariantsPanel from '@/features/admin/product/VariantsPanel.jsx'
import { ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getProduct, listTaxonomy } from '@/services/adminCatalogService'

export default function AdminProductEdit() {
    const { id } = useParams()
    const navigate = useNavigate()
    const isNew = !id

    const product = useAsync(() => (isNew ? Promise.resolve(null) : getProduct(id)), [id])
    const lists = useAsync(
        () => Promise.all([listTaxonomy('categories'), listTaxonomy('collections')]),
        []
    )
    useDocumentTitle(isNew ? 'New product' : product.data?.name ?? 'Product')

    if (product.error || lists.error) {
        return <ErrorState error={product.error || lists.error} onRetry={() => { product.reload(); lists.reload() }} />
    }
    if ((product.loading && !product.data && !isNew) || !lists.data) return <p aria-busy="true">Loading…</p>
    if (!isNew && !product.data) return <p>Product not found. <Link to="/admin/products" className="underline">Back to products</Link></p>

    const [categories, collections] = lists.data

    return (
        <section className="space-y-10">
            <div>
                <p className="text-sm"><Link to="/admin/products" className="underline">← All products</Link></p>
                <h1 className="mt-2 text-4xl text-maroon">{isNew ? 'New product' : product.data.name}</h1>
                {isNew && <p className="mt-1 text-sm">Save the product first. Then you can add images, options and stock.</p>}
            </div>

            <ProductForm
                key={product.data?.updated_at ?? 'new'}
                product={product.data}
                categories={categories}
                collections={collections}
                onSaved={(savedId) => (isNew ? navigate(`/admin/products/${savedId}`) : product.reload())}
            />

            {!isNew && (
                <>
                    <ImagesPanel product={product.data} onChanged={product.reload} />
                    <VariantsPanel product={product.data} onChanged={product.reload} />
                    <StockPanel product={product.data} onChanged={product.reload} />
                </>
            )}
        </section>
    )
}