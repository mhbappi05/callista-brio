import CollectionCard from '@/components/products/CollectionCard.jsx'
import { EmptyState, ErrorState } from '@/components/common/States.jsx'
import { useAsync } from '@/hooks/useAsync'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { getCollections } from '@/services/catalogService'

export default function Collections() {
  useDocumentTitle('Collections')
  const { data, error, loading, reload } = useAsync(getCollections, [])

  return (
    <section className="container-page py-10">
      <h1 className="text-4xl text-maroon">Collections</h1>
      {error ? <ErrorState error={error} onRetry={reload} />
        : loading && !data ? <p className="mt-6" aria-busy="true">Loading…</p>
        : !data?.length ? <EmptyState title="No collections yet" message="New drops will appear here." />
        : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.map((c) => <li key={c.id}><CollectionCard collection={c} /></li>)}
          </ul>
        )}
    </section>
  )
}