import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext.jsx'
import {
  clearServerCart, fetchServerLines, getOrCreateCartId, removeServerLine, setServerLine,
} from '@/services/cartService'
import { getProductsByIds } from '@/services/catalogService'
import {
  clampQty, countItems, enrichLines, hasPurchasable, lineKey, mergeLines, subtotalOf,
} from '@/utils/cart'

const CartContext = createContext(null)
const LOCAL_KEY = 'cb_cart_v1'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((l) => l && UUID.test(l.productId) && (l.variantId == null || UUID.test(l.variantId)))
      .map((l) => ({ productId: l.productId, variantId: l.variantId ?? null, quantity: clampQty(l.quantity) }))
  } catch {
    return []
  }
}

function writeLocal(lines) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(lines))
  } catch {
    // Storage can be unavailable (private mode); the cart then lasts for this visit only.
  }
}

// Loads the signed-in user's server cart and merges any guest lines into it.
async function loadUserCart(userId) {
  const cartId = await getOrCreateCartId(userId)
  const server = await fetchServerLines(cartId)
  const local = readLocal()
  const merged = mergeLines(server, local)
  const serverQty = new Map(server.map((l) => [lineKey(l), l.quantity]))
  for (const line of merged) {
    if (serverQty.get(lineKey(line)) !== line.quantity) await setServerLine(cartId, line)
  }
  writeLocal([])
  return { cartId, lines: merged }
}

export function CartProvider({ children }) {
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null

  const [lines, setLines] = useState(readLocal)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [syncError, setSyncError] = useState(false)
  const [products, setProducts] = useState([])
  const [fetchedKey, setFetchedKey] = useState('')
  const [detailsError, setDetailsError] = useState(false)
  const [nonce, setNonce] = useState(0)

  const linesRef = useRef(lines)
  const cartIdRef = useRef(null)
  const initRef = useRef(null)
  const queueRef = useRef(Promise.resolve())

  const enqueue = useCallback((op) => {
    queueRef.current = queueRef.current.then(op).catch((err) => {
      console.error(err)
      setSyncError(true)
    })
  }, [])

  // Load the right cart whenever the signed-in user changes.
  useEffect(() => {
    if (authLoading) return undefined
    let cancelled = false

    if (!userId) {
      initRef.current = null
      cartIdRef.current = null
      const local = readLocal()
      linesRef.current = local
      setLines(local)
      setReady(true)
      return undefined
    }

    setReady(false)
    // Reuse an in-flight load for the same user (React StrictMode runs effects twice).
    let entry = initRef.current
    if (!entry || entry.userId !== userId) {
      entry = { userId, promise: loadUserCart(userId) }
      initRef.current = entry
    }
    entry.promise
      .then(({ cartId, lines: loaded }) => {
        if (cancelled) return
        cartIdRef.current = cartId
        linesRef.current = loaded
        setLines(loaded)
        setReady(true)
      })
      .catch((err) => {
        console.error(err)
        if (cancelled) return
        setSyncError(true)
        setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [userId, authLoading])

  // Live product data for the lines (price, stock, availability).
  const idsKey = useMemo(
    () => [...new Set(lines.map((l) => l.productId))].sort().join(','),
    [lines]
  )

  useEffect(() => {
    if (!idsKey) {
      setProducts([])
      setFetchedKey('')
      setDetailsError(false)
      return undefined
    }
    let cancelled = false
    setDetailsError(false)
    getProductsByIds(idsKey.split(','))
      .then((data) => {
        if (cancelled) return
        setProducts(data)
        setFetchedKey(idsKey)
      })
      .catch(() => {
        if (!cancelled) setDetailsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [idsKey, nonce])

  const loading = idsKey !== '' && fetchedKey !== idsKey && !detailsError
  const items = useMemo(
    () => enrichLines(lines, products, { pending: loading }),
    [lines, products, loading]
  )

  const commit = useCallback(
    (next, changed, removed) => {
      linesRef.current = next
      setLines(next)
      const cartId = cartIdRef.current
      if (cartId) {
        enqueue(() => (removed ? removeServerLine(cartId, changed) : setServerLine(cartId, changed)))
      } else {
        writeLocal(next)
      }
    },
    [enqueue]
  )

  const addItem = useCallback(
    ({ productId, variantId = null, quantity = 1 }) => {
      if (!ready) return false
      const current = linesRef.current
      const key = lineKey({ productId, variantId })
      const existing = current.find((l) => lineKey(l) === key)
      const line = { productId, variantId, quantity: clampQty((existing?.quantity ?? 0) + quantity) }
      const next = existing ? current.map((l) => (lineKey(l) === key ? line : l)) : [...current, line]
      commit(next, line, false)
      return true
    },
    [ready, commit]
  )

  const removeItem = useCallback(
    (key) => {
      const current = linesRef.current
      const target = current.find((l) => lineKey(l) === key)
      if (!target) return
      commit(current.filter((l) => lineKey(l) !== key), target, true)
    },
    [commit]
  )

  const updateQuantity = useCallback(
    (key, quantity) => {
      if (quantity < 1) {
        removeItem(key)
        return
      }
      const current = linesRef.current
      const target = current.find((l) => lineKey(l) === key)
      if (!target) return
      const line = { ...target, quantity: clampQty(quantity) }
      commit(current.map((l) => (lineKey(l) === key ? line : l)), line, false)
    },
    [commit, removeItem]
  )

  // Call after an order is placed (Phase 5).
  const clear = useCallback(() => {
    linesRef.current = []
    setLines([])
    const cartId = cartIdRef.current
    if (cartId) enqueue(() => clearServerCart(cartId))
    else writeLocal([])
  }, [enqueue])

  const openCart = useCallback(() => {
    setOpen(true)
    setNonce((n) => n + 1) // refresh price and stock whenever the cart is opened
  }, [])
  const closeCart = useCallback(() => setOpen(false), [])
  const reload = useCallback(() => setNonce((n) => n + 1), [])

  const value = useMemo(
    () => ({
      lines, items, ready, loading, error: detailsError, syncError,
      count: countItems(lines),
      subtotal: subtotalOf(items),
      canCheckout: hasPurchasable(items) && !loading,
      open, openCart, closeCart, reload,
      addItem, removeItem, updateQuantity, clear,
    }),
    [lines, items, ready, loading, detailsError, syncError, open,
      openCart, closeCart, reload, addItem, removeItem, updateQuantity, clear]
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}