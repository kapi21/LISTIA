import { useState, useEffect, useMemo, useCallback } from 'react'
import type { MercadonaProduct } from '../domain/notebookTypes'

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export function useMercadonaCatalog() {
  const [catalog, setCatalog] = useState<MercadonaProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    fetch('/mercadona-catalog.json')
      .then((res) => {
        if (!res.ok) throw new Error('No se pudo cargar el catálogo de Mercadona')
        return res.json() as Promise<MercadonaProduct[]>
      })
      .then((data) => {
        if (isMounted) {
          setCatalog(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Error cargando mercadona-catalog.json:', err)
          setError(err.message)
          setLoading(false)
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Extract unique categories
  const categories = useMemo(() => {
    const map = new Map<string, number>()
    for (const prod of catalog) {
      if (prod.category) {
        map.set(prod.category, (map.get(prod.category) || 0) + 1)
      }
    }
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [catalog])

  // Search function
  const searchProducts = useCallback(
    (query: string, categoryFilter?: string, limit = 40): MercadonaProduct[] => {
      const q = normalizeText(query)
      if (!q && !categoryFilter) return catalog.slice(0, limit)

      const terms = q.split(/\s+/).filter(Boolean)

      return catalog
        .filter((prod) => {
          if (categoryFilter && prod.category !== categoryFilter) {
            return false
          }
          if (terms.length === 0) return true

          const nameNorm = normalizeText(prod.name)
          const catNorm = normalizeText(prod.category)
          const subNorm = normalizeText(prod.subcategory || '')

          return terms.every(
            (term) =>
              nameNorm.includes(term) ||
              catNorm.includes(term) ||
              subNorm.includes(term)
          )
        })
        .slice(0, limit)
    },
    [catalog]
  )

  return {
    catalog,
    loading,
    error,
    categories,
    searchProducts,
  }
}
