import { usePageMeta } from './usePageMeta'

// useDocumentTitle('Shop')  or  useDocumentTitle('Shop', { description: '…' })
export function useDocumentTitle(title, options = {}) {
  usePageMeta({ title, ...options })
}