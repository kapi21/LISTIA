import { describe, expect, it } from 'vitest'
import { mergeItems } from './merge'
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
})
