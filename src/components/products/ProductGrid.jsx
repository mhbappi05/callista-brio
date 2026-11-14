import ProductCard from './ProductCard.jsx'

export default function ProductGrid({ products }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4">
      {products.map((p) => (
        <li key={p.id}><ProductCard product={p} /></li>
      ))}
    </ul>
  )
}