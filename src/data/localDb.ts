import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { ShoppingItem } from '../domain/types'

interface ListaDb extends DBSchema {
  meta: { key: string; value: string }
  items: { key: string; value: { pin: string; items: ShoppingItem[] } }
}

let dbPromise: Promise<IDBPDatabase<ListaDb>> | null = null

function db() {
  if (!dbPromise) {
    dbPromise = openDB<ListaDb>('lista-compra', 1, {
      upgrade(database) {
        database.createObjectStore('meta')
        database.createObjectStore('items', { keyPath: 'pin' })
      },
    })
  }
  return dbPromise
}

export async function saveSession(pin: string): Promise<void> {
  await (await db()).put('meta', pin, 'pin')
}

export async function loadSession(): Promise<string | null> {
  return (await (await db()).get('meta', 'pin')) ?? null
}

export async function clearSession(): Promise<void> {
  await (await db()).delete('meta', 'pin')
}

export async function putItems(pin: string, items: ShoppingItem[]): Promise<void> {
  await (await db()).put('items', { pin, items })
}

export async function getItems(pin: string): Promise<ShoppingItem[]> {
  const row = await (await db()).get('items', pin)
  return row?.items ?? []
}
