import 'fake-indexeddb/auto'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemorySync } from '../data/sync'
import { useShoppingList } from './useShoppingList'

beforeEach(async () => {
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('lista-compra')
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
    req.onblocked = () => resolve()
  })
  localStorage.clear()
})

describe('useShoppingList', () => {
  it('añade ítem con MemorySync e IndexedDB', async () => {
    const listSync = createMemorySync()
    await listSync.createHousehold('111111')

    const { result } = renderHook(() => useShoppingList('111111', listSync))

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

  it('remove no ressuscita ítem cuando remoto envía versión antigua viva', async () => {
    const listSync = createMemorySync()
    await listSync.createHousehold('222222')

    const { result } = renderHook(() => useShoppingList('222222', listSync))

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

    const id = result.current.items[0]!.id

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
    })

    await act(async () => {
      await result.current.remove(id)
    })

    await waitFor(() => {
      expect(result.current.items).toHaveLength(0)
    })

    await act(async () => {
      await listSync.upsertItem('222222', {
        id,
        name: 'Leche',
        quantity: '1',
        note: '',
        done: false,
        productId: null,
        updatedAt: 1,
        updatedBy: 'stale-remote',
      })
    })

    await waitFor(() => {
      expect(result.current.items).toHaveLength(0)
    })
  })
})
