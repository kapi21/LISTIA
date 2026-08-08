import type { ShoppingItem } from './types'

export function mergeItems(local: ShoppingItem[], remote: ShoppingItem[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()
  for (const item of [...local, ...remote]) {
    const prev = map.get(item.id)
    if (!prev || item.updatedAt > prev.updatedAt) map.set(item.id, item)
  }
  return [...map.values()]
}
