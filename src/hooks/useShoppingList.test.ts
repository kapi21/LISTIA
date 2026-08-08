import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemorySync } from '../data/sync'
import { useShoppingList } from './useShoppingList'

beforeEach(async () => {
  indexedDB.deleteDatabase('lista-compra')
  localStorage.clear()
})

describe('useShoppingList', () => {
  it('añade ítem con MemorySync e IndexedDB', async () => {
    const listSync = createMemorySync()
    await listSync.createHousehold('123456')

    const { result } = renderHook(() => useShoppingList('123456', listSync))

    await waitFor(() => {
      expect(result.current.items).toEqual([])
    })

    await act(async () => {
      await result.current.add({
        name: 'Leche',
        quantity: '1',
        note: '',
        productId: null,
      })
    })

    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]!.name).toBe('Leche')
    expect(result.current.items[0]!.done).toBe(false)
  })
})
