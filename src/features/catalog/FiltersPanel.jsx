import { useEffect, useState } from 'react'

const fieldClass = 'mt-1 w-full border border-maroon/30 bg-cream px-3 py-2'

export default function FiltersPanel({ options, filters, onChange }) {
  const [min, setMin] = useState(filters.minPrice ?? '')
  const [max, setMax] = useState(filters.maxPrice ?? '')

  useEffect(() => {
    setMin(filters.minPrice ?? '')
    setMax(filters.maxPrice ?? '')
  }, [filters.minPrice, filters.maxPrice])

  function applyPrice(e) {
    e.preventDefault()
    let lo = min === '' ? '' : Number(min)
    let hi = max === '' ? '' : Number(max)
    if (lo !== '' && hi !== '' && lo > hi) [lo, hi] = [hi, lo]
    onChange({ min: lo, max: hi })
  }

  return (
    <div className="space-y-5">
      <label className="block text-sm">
        Category
        <select className={fieldClass} value={filters.category}
          onChange={(e) => onChange({ category: e.target.value })}>
          <option value="">All categories</option>
          {options?.categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>

      <label className="block text-sm">
        Collection
        <select className={fieldClass} value={filters.collection}
          onChange={(e) => onChange({ collection: e.target.value })}>
          <option value="">All collections</option>
          {options?.collections.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </label>

      {options?.materials.length > 0 && (
        <label className="block text-sm">
          Material
          <select className={fieldClass} value={filters.material}
            onChange={(e) => onChange({ material: e.target.value })}>
            <option value="">Any material</option>
            {options.materials.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
      )}

      <form onSubmit={applyPrice} className="text-sm">
        <fieldset>
          <legend>Price (৳)</legend>
          <div className="mt-1 flex items-center gap-2">
            <label className="flex-1">
              <span className="sr-only">Minimum price</span>
              <input type="number" min="0" inputMode="numeric" placeholder="Min"
                className="w-full border border-maroon/30 bg-cream px-3 py-2"
                value={min} onChange={(e) => setMin(e.target.value)} />
            </label>
            <span aria-hidden="true">to</span>
            <label className="flex-1">
              <span className="sr-only">Maximum price</span>
              <input type="number" min="0" inputMode="numeric" placeholder="Max"
                className="w-full border border-maroon/30 bg-cream px-3 py-2"
                value={max} onChange={(e) => setMax(e.target.value)} />
            </label>
          </div>
          <button type="submit" className="btn-secondary mt-3 w-full !py-2">Apply price</button>
        </fieldset>
      </form>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={filters.availableOnly}
          onChange={(e) => onChange({ available: e.target.checked ? '1' : '' })} />
        In stock only
      </label>
    </div>
  )
}