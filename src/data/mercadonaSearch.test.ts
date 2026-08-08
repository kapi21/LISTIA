import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchProducts } from './mercadonaSearch'

afterEach(() => vi.unstubAllGlobals())

describe('searchProducts', () => {
  it('devuelve [] si query corta', async () => {
    expect(await searchProducts('a')).toEqual([])
  })

  it('mapea hits de Algolia', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          hits: [{ id: 51621, display_name: 'Queso camembert', name: 'Queso' }],
        }),
      }),
    )
    const hits = await searchProducts('queso')
    expect(hits[0]).toEqual({
      productId: '51621',
      name: 'Queso',
      displayName: 'Queso camembert',
    })
  })

  it('si fetch falla, []', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('net')))
    expect(await searchProducts('leche')).toEqual([])
  })
})
