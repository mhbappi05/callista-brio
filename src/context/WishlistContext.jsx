import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import { addToWishlist, getWishlistIds, removeFromWishlist } from '@/services/wishlistService'

const WishlistContext = createContext(null)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [ids, setIds] = useState(() => new Set())

  useEffect(() => {
    if (!userId) {
      setIds(new Set())
      return undefined
    }
    let active = true
    getWishlistIds(userId)
      .then((list) => {
        if (active) setIds(new Set(list))
      })
      .catch((err) => console.error(err))
    return () => {
      active = false
    }
  }, [userId])

  // Returns 'auth_required' for guests so the caller can send them to sign in.
  const toggle = useCallback(
    async (productId) => {
      if (!userId) return 'auth_required'
      const saved = ids.has(productId)
      setIds((prev) => {
        const next = new Set(prev)
        if (saved) next.delete(productId)
        else next.add(productId)
        return next
      })
      try {
        if (saved) await removeFromWishlist(userId, productId)
        else await addToWishlist(userId, productId)
        return saved ? 'removed' : 'added'
      } catch (err) {
        console.error(err)
        setIds((prev) => {
          const next = new Set(prev)
          if (saved) next.add(productId)
          else next.delete(productId)
          return next
        })
        return 'error'
      }
    },
    [userId, ids]
  )

  const has = useCallback((productId) => ids.has(productId), [ids])
  const value = useMemo(() => ({ ids, has, toggle, count: ids.size }), [ids, has, toggle])

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>
}

export function useWishlist() {
  const ctx = useContext(WishlistContext)
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider')
  return ctx
}