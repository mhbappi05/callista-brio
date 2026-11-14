import { useEffect } from 'react'

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | Callista Brio` : 'Callista Brio | Handcrafted jewelry'
  }, [title])
}