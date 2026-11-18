export function LoadingGrid({ count = 8 }) {
    return (
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 xl:grid-cols-4" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: count }).map((_, i) => (
          <li key={i} className="animate-pulse">
            <div className="aspect-[4/5] bg-blush" />
            <div className="mt-3 h-4 w-3/4 bg-blush" />
            <div className="mt-2 h-4 w-1/3 bg-blush" />
          </li>
        ))}
      </ul>
    )
  }
  
  export function EmptyState({ title, message, action }) {
    return (
      <div className="py-16 text-center">
        <p className="font-display text-3xl text-maroon">{title}</p>
        {message && <p className="mx-auto mt-2 max-w-md">{message}</p>}
        {action && <div className="mt-6">{action}</div>}
      </div>
    )
  }
  
  export function ErrorState({ error, onRetry }) {
    const notConfigured = error?.message === 'SUPABASE_NOT_CONFIGURED'
    return (
      <div role="alert" className="py-16 text-center">
        <p className="font-display text-3xl text-maroon">
          {notConfigured ? 'Store connection is not set up' : 'This page did not load'}
        </p>
        <p className="mx-auto mt-2 max-w-md">
          {notConfigured
            ? 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file, then restart the dev server.'
            : 'Check your internet connection and try again.'}
        </p>
        {onRetry && !notConfigured && (
          <button type="button" onClick={onRetry} className="btn-secondary mt-6">Try again</button>
        )}
      </div>
    )
  }