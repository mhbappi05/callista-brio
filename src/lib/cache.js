const store = new Map()

// Caches the promise, so simultaneous callers share one request.
// Failures are not cached.
export function cached(key, ttlMs, fn, now = Date.now) {
    const hit = store.get(key)
    if (hit && now() - hit.at < ttlMs) return hit.promise
    const promise = Promise.resolve()
        .then(fn)
        .catch((err) => {
            store.delete(key)
            throw err
        })
    store.set(key, { at: now(), promise })
    return promise
}

export const clearCache = () => store.clear()