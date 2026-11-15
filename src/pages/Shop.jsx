import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, X } from 'lucide-react'
import ProductGrid from '@/components/products/ProductGrid.jsx'
import FiltersPanel from '@/features/catalog/FiltersPanel.jsx'
import { EmptyState, ErrorState, LoadingGrid } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PAGE_SIZE, getShopFilterOptions, listProducts } from '@/services/catalogService'

const toNumber = (v) => (v === null || v === '' || Number.isNaN(Number(v)) ? null : Number(v))

export default function Shop() {
  useDocumentTitle('Shop')
  const [params, setParams] = useSearchParams()

  const filters = useMemo(() => ({
    q: params.get('q') ?? '',
    category: params.get('category') ?? '',
    collection: params.get('collection') ?? '',
    material: params.get('material') ?? '',
    minPrice: toNumber(params.get('min')),
    maxPrice: toNumber(params.get('max')),
    availableOnly: params.get('available') === '1',
    sort: params.get('sort') ?? 'newest',
    page: Math.max(1, Number(params.get('page')) || 1),
  }), [params])

  const products = useAsync(() => listProducts(filters), [params.toString()])
  const options = useAsync(getShopFilterOptions, [])

  const [term, setTerm] = useState(filters.q)
  useEffect(() => {
    setTerm(filters.q)
  }, [filters.q])

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [filters.page])

  function update(patch) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(patch)) {
      if (value === '' || value == null || value === false) next.delete(key)
      else next.set(key, String(value))
    }
    if (!('page' in patch)) next.delete('page')
    setParams(next)
  }

  const nameOf = (list, slug) => list?.find((i) => i.slug === slug)?.name ?? slug
  const chips = [
    filters.q && { label: `Search: ${filters.q}`, clear: { q: '' } },
    filters.category && { label: nameOf(options.data?.categories, filters.category), clear: { category: '' } },
    filters.collection && { label: nameOf(options.data?.collections, filters.collection), clear: { collection: '' } },
    filters.material && { label: filters.material, clear: { material: '' } },
    (filters.minPrice != null || filters.maxPrice != null) && {
      label: `৳${filters.minPrice ?? 0} – ${filters.maxPrice != null ? `৳${filters.maxPrice}` : 'any'}`,
      clear: { min: '', max: '' },
    },
    filters.availableOnly && { label: 'In stock', clear: { available: '' } },
  ].filter(Boolean)

  const total = products.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">Shop</h1>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <form role="search" className="flex flex-1"
          onSubmit={(e) => { e.preventDefault(); update({ q: term.trim() }) }}>
          <label className="sr-only" htmlFor="shop-search">Search products</label>
          <input id="shop-search" type="search" value={term} onChange={(e) => setTerm(e.target.value)}
            placeholder="Search by name, material or color"
            className="w-full border border-maroon/30 bg-cream px-4 py-2" />
          <button type="submit" className="bg-maroon px-4 text-ink-light" aria-label="Search">
            <Search size={18} />
          </button>
        </form>
        <label className="flex items-center gap-2 text-sm">
          Sort
          <select value={filters.sort} onChange={(e) => update({ sort: e.target.value === 'newest' ? '' : e.target.value })}
            className="border border-maroon/30 bg-cream px-3 py-2">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
          </select>
        </label>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[16rem_1fr]">
        <aside>
          <details className="float-card p-4 lg:hidden">
            <summary className="cursor-pointer font-medium">Filters</summary>
            <div className="mt-4"><FiltersPanel options={options.data} filters={filters} onChange={update} /></div>
          </details>
          <div className="hidden lg:block">
            <FiltersPanel options={options.data} filters={filters} onChange={update} />
          </div>
        </aside>

        <div>
          {chips.length > 0 && (
            <ul className="mb-6 flex flex-wrap items-center gap-2">
              {chips.map((c) => (
                <li key={c.label}>
                  <button type="button" onClick={() => update(c.clear)}
                    className="flex items-center gap-1 bg-blush px-3 py-1 text-sm">
                    {c.label} <X size={14} aria-hidden="true" />
                    <span className="sr-only">Remove filter</span>
                  </button>
                </li>
              ))}
              <li>
                <button type="button" onClick={() => setParams(new URLSearchParams())}
                  className="text-sm underline">Clear all</button>
              </li>
            </ul>
          )}

          {products.error ? (
            <ErrorState error={products.error} onRetry={products.reload} />
          ) : products.loading && !products.data ? (
            <LoadingGrid />
          ) : products.data.items.length === 0 ? (
            <EmptyState
              title="No pieces match these filters"
              message="Try removing a filter or searching for something broader."
              action={chips.length > 0 && (
                <button type="button" className="btn-secondary" onClick={() => setParams(new URLSearchParams())}>
                  Clear all filters
                </button>
              )}
            />
          ) : (
            <>
              <p className="mb-4 text-sm" aria-live="polite">{total} {total === 1 ? 'piece' : 'pieces'}</p>
              <ProductGrid products={products.data.items} />
              {totalPages > 1 && (
                <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
                  <button type="button" className="btn-secondary" disabled={filters.page <= 1}
                    onClick={() => update({ page: filters.page - 1 })}>Previous</button>
                  <span className="text-sm">Page {filters.page} of {totalPages}</span>
                  <button type="button" className="btn-secondary" disabled={filters.page >= totalPages}
                    onClick={() => update({ page: filters.page + 1 })}>Next</button>
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  )
}