import type { ShoppingItem } from '../domain/types'

export type ListSync = {
  createHousehold(pin: string): Promise<void>
  joinHousehold(pin: string): Promise<boolean>
  subscribeItems(pin: string, onChange: (items: ShoppingItem[]) => void): () => void
  upsertItem(pin: string, item: ShoppingItem): Promise<void>
  deleteItem(pin: string, id: string): Promise<void>
}

/** Sync en memoria para desarrollo/tests sin credenciales Firebase. */
export function createMemorySync(): ListSync {
  const households = new Map<string, Map<string, ShoppingItem>>()
  const listeners = new Map<string, Set<(items: ShoppingItem[]) => void>>()

  function emit(pin: string) {
    const items = [...(households.get(pin)?.values() ?? [])]
    for (const cb of listeners.get(pin) ?? []) cb(items)
  }

  return {
    async createHousehold(pin) {
      if (!households.has(pin)) households.set(pin, new Map())
    },
    async joinHousehold(pin) {
      return households.has(pin)
    },
    subscribeItems(pin, onChange) {
      if (!listeners.has(pin)) listeners.set(pin, new Set())
      listeners.get(pin)!.add(onChange)
      onChange([...(households.get(pin)?.values() ?? [])])
      return () => listeners.get(pin)?.delete(onChange)
    },
    async upsertItem(pin, item) {
      if (!households.has(pin)) households.set(pin, new Map())
      households.get(pin)!.set(item.id, item)
      emit(pin)
    },
    async deleteItem(pin, id) {
      households.get(pin)?.delete(id)
      emit(pin)
    },
  }
}
