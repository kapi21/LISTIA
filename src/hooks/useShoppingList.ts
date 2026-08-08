import { useCallback, useEffect, useMemo, useState } from 'react'
import { getItems, putItems } from '../data/localDb'
import type { ListSync } from '../data/sync'
import { getOrCreateDeviceId } from '../domain/deviceId'
import { mergeItems } from '../domain/merge'
import type { ShoppingItem, SyncStatus } from '../domain/types'

type AddInput = {
  name: string
  quantity: string
  note: string
  productId: string | null
}

type ItemPatch = Partial<Pick<ShoppingItem, 'name' | 'quantity' | 'note' | 'productId' | 'done'>>

function initialSyncStatus(): SyncStatus {
  return typeof navigator !== 'undefined' && navigator.onLine ? 'online' : 'offline'
}

export function useShoppingList(pin: string | null, listSync: ListSync) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(initialSyncStatus)
  const deviceId = useMemo(() => getOrCreateDeviceId(), [])

  useEffect(() => {
    const onOnline = () => setSyncStatus('online')
    const onOffline = () => setSyncStatus('offline')
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  useEffect(() => {
    if (!pin) {
      setItems([])
      return
    }

    let cancelled = false
    void (async () => {
      const local = await getItems(pin)
      if (!cancelled) setItems(local)
    })()

    const unsub = listSync.subscribeItems(pin, (remote) => {
      void (async () => {
        const local = await getItems(pin)
        const merged = mergeItems(local, remote)
        if (cancelled) return
        setItems(merged)
        await putItems(pin, merged)
      })()
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [pin, listSync])

  const add = useCallback(
    async (input: AddInput) => {
      if (!pin) return
      const item: ShoppingItem = {
        id: crypto.randomUUID(),
        name: input.name,
        quantity: input.quantity,
        note: input.note,
        done: false,
        productId: input.productId,
        updatedAt: Date.now(),
        updatedBy: deviceId,
      }
      const prev = await getItems(pin)
      const next = [...prev, item]
      setItems(next)
      await putItems(pin, next)
      await listSync.upsertItem(pin, item)
    },
    [pin, deviceId, listSync],
  )

  const toggle = useCallback(
    async (id: string) => {
      if (!pin) return
      const prev = await getItems(pin)
      let updated: ShoppingItem | undefined
      const next = prev.map((it) => {
        if (it.id !== id) return it
        updated = { ...it, done: !it.done, updatedAt: Date.now(), updatedBy: deviceId }
        return updated
      })
      if (!updated) return
      setItems(next)
      await putItems(pin, next)
      await listSync.upsertItem(pin, updated)
    },
    [pin, deviceId, listSync],
  )

  const update = useCallback(
    async (id: string, partial: ItemPatch) => {
      if (!pin) return
      const prev = await getItems(pin)
      let updated: ShoppingItem | undefined
      const next = prev.map((it) => {
        if (it.id !== id) return it
        updated = { ...it, ...partial, updatedAt: Date.now(), updatedBy: deviceId }
        return updated
      })
      if (!updated) return
      setItems(next)
      await putItems(pin, next)
      await listSync.upsertItem(pin, updated)
    },
    [pin, deviceId, listSync],
  )

  const remove = useCallback(
    async (id: string) => {
      if (!pin) return
      const prev = await getItems(pin)
      const next = prev.filter((it) => it.id !== id)
      setItems(next)
      await putItems(pin, next)
      await listSync.deleteItem(pin, id)
    },
    [pin, listSync],
  )

  return { items, add, toggle, update, remove, syncStatus }
}
