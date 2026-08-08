import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { clearSession, getItems, loadSession, putItems, saveSession } from './localDb'

beforeEach(async () => {
  indexedDB.deleteDatabase('lista-compra')
})

describe('localDb', () => {
  it('persiste sesión PIN', async () => {
    await saveSession('123456')
    expect(await loadSession()).toBe('123456')
    await clearSession()
    expect(await loadSession()).toBeNull()
  })

  it('persiste ítems por PIN', async () => {
    await putItems('123456', [
      {
        id: 'a',
        name: 'Pan',
        quantity: '1',
        note: '',
        done: false,
        productId: null,
        updatedAt: 1,
        updatedBy: 'dev',
      },
    ])
    const items = await getItems('123456')
    expect(items).toHaveLength(1)
    expect(items[0]!.name).toBe('Pan')
  })
})
