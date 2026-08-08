export type TicketStat = {
  productKey: string
  name: string
  count: number
  lastPurchasedAt: number
}

export type GmailConnectionPublic = {
  email: string
  lastSyncAt: number | null
  status: 'connected' | 'needs_reauth' | 'disconnected'
}
