import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSyncTickets = vi.fn()
const mockGetGmailConnectionPublic = vi.fn()
const mockSubscribeTicketStats = vi.fn()
const mockStartGmailOAuth = vi.fn()

vi.mock('../data/ticketStats', () => ({
  subscribeTicketStats: (...args: unknown[]) => mockSubscribeTicketStats(...args),
  getGmailConnectionPublic: (...args: unknown[]) => mockGetGmailConnectionPublic(...args),
  startGmailOAuth: (...args: unknown[]) => mockStartGmailOAuth(...args),
  syncTickets: (...args: unknown[]) => mockSyncTickets(...args),
}))

import { useTicketStats } from './useTicketStats'

describe('useTicketStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscribeTicketStats.mockImplementation((_pin, cb) => {
      cb([])
      return () => {}
    })
    mockGetGmailConnectionPublic.mockResolvedValue({
      email: 'test@example.com',
      lastSyncAt: null,
      status: 'connected',
    })
  })

  it('refresh llama syncTickets y guarda lastResult', async () => {
    mockSyncTickets.mockResolvedValue({ imported: 2, skipped: 1, errors: 0 })

    const { result } = renderHook(() => useTicketStats('123456'))

    await waitFor(() => {
      expect(result.current.connection.status).toBe('connected')
    })

    await act(async () => {
      await result.current.refresh()
    })

    expect(mockSyncTickets).toHaveBeenCalledWith('123456')
    expect(result.current.lastResult).toEqual({ imported: 2, skipped: 1, errors: 0 })
    expect(result.current.syncing).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
