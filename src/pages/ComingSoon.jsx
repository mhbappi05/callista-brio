export default function ComingSoon({ title = 'Coming soon' }) {
    return (
      <section className="container-page py-16">
        <h1 className="text-4xl text-maroon">{title}</h1>
        <p className="mt-3">This part of the store is being built.</p>
      </section>
    )
  }