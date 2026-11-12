import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <section className="bg-blush">
      <div className="container-page py-20 sm:py-28">
        <h1 className="max-w-2xl text-5xl text-maroon sm:text-6xl">
          Handcrafted pieces for the woman who shines
        </h1>
        <p className="mt-4 max-w-prose">
          Jhumkas, studs, hoops and hand-painted statement pieces, made by hand and delivered across Bangladesh.
        </p>
        <Link to="/shop" className="btn-primary mt-8">Shop the collection</Link>
      </div>
    </section>
  )
}
