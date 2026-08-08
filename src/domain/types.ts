export type ShoppingItem = {
  id: string
  name: string
  quantity: string
  note: string
  done: boolean
  productId: string | null
  updatedAt: number
  updatedBy: string
}

export type Household = {
  pin: string
  createdAt: number
  name?: string
}

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error'
