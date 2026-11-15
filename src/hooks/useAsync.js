import { useCallback, useEffect, useState } from 'react'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Retry once, and only for failures that look like a dropped connection.
// Database and permission errors carry a code and are not retried.
const retryable = (err) => !err?.code && err?.message !== 'SUPABASE_NOT_CONFIGURED'

// Runs an async function when `deps` change. Keeps the previous data visible
// while reloading, and ignores results from stale requests.
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))

    fn()
      .catch(async (err) => {
        if (cancelled || !retryable(err)) throw err
        await sleep(700)
        if (cancelled) throw err
        return fn()
      })
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (!cancelled) setState({ data: null, error, loading: false })
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}