import { describe, expect, it, vi } from 'vitest'
import { createMemorySync } from './sync'

const sampleItem = {
  id: 'a',
  name: 'Pan',
  quantity: '1',
  note: '',
  done: false,
  productId: null,
  updatedAt: 1,
  updatedBy: 'dev',
}

describe('createMemorySync', () => {
  it('notifica suscriptores al upsert/delete', async () => {
    const sync = createMemorySync()
    await sync.createHousehold('123456')
    const onChange = vi.fn()
    sync.subscribeItems('123456', onChange)
    expect(onChange).toHaveBeenCalledWith([])

    await sync.upsertItem('123456', sampleItem)
    expect(onChange).toHaveBeenLastCalledWith([sampleItem])

    await sync.deleteItem('123456', 'a')
    expect(onChange).toHaveBeenLastCalledWith([])
  })

  it('joinHousehold devuelve false si no existe', async () => {
    const sync = createMemorySync()
    expect(await sync.joinHousehold('999999')).toBe(false)
    await sync.createHousehold('999999')
    expect(await sync.joinHousehold('999999')).toBe(true)
  })
})
