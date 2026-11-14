import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export default function About() {
  useDocumentTitle('About')
  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">About Callista Brio</h1>
      {/* Placeholder copy: replace with the owner's story. */}
      <p className="mt-4 max-w-prose">
        Callista Brio makes handmade, artsy and cozy jewelry and accessories for the woman who shines.
        Each piece is made by hand in small batches.
      </p>
    </section>
  )
}