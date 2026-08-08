import { describe, expect, it } from 'vitest'
import { mergeItems, visibleItems } from './merge'
import type { ShoppingItem } from './types'

const base = (over: Partial<ShoppingItem>): ShoppingItem => ({
  id: '1',
  name: 'Leche',
  quantity: '1',
  note: '',
  done: false,
  productId: null,
  updatedAt: 100,
  updatedBy: 'a',
  ...over,
})

describe('mergeItems', () => {
  it('elige la versión con updatedAt mayor', () => {
    const local = [base({ name: 'Local', updatedAt: 100 })]
    const remote = [base({ name: 'Remote', updatedAt: 200 })]
    expect(mergeItems(local, remote)[0]!.name).toBe('Remote')
  })

  it('une ids distintos', () => {
    const local = [base({ id: '1' })]
    const remote = [base({ id: '2', name: 'Pan' })]
    expect(mergeItems(local, remote)).toHaveLength(2)
  })

  it('local deleted (newer) gana sobre remoto alive (older)', () => {
    const local = [base({ deleted: true, updatedAt: 200 })]
    const remote = [base({ deleted: false, updatedAt: 100 })]
    const merged = mergeItems(local, remote)[0]!
    expect(merged.deleted).toBe(true)
    expect(visibleItems([merged])).toHaveLength(0)
  })

  it('remoto deleted (newer) gana sobre local alive (older)', () => {
    const local = [base({ deleted: false, updatedAt: 100 })]
    const remote = [base({ deleted: true, updatedAt: 200 })]
    const merged = mergeItems(local, remote)[0]!
    expect(merged.deleted).toBe(true)
    expect(visibleItems([merged])).toHaveLength(0)
  })
})
