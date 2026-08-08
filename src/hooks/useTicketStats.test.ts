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

  it('resetea stats, lastResult y error al cambiar pin', async () => {
    const statsA = [{ productKey: 'a', name: 'A', count: 1, lastPurchasedAt: 1 }]
    const statsB = [{ productKey: 'b', name: 'B', count: 2, lastPurchasedAt: 2 }]

    mockSubscribeTicketStats.mockImplementation((pin, cb) => {
      queueMicrotask(() => {
        cb(pin === '111111' ? statsA : statsB)
      })
      return () => {}
    })
    mockGetGmailConnectionPublic.mockImplementation((activePin: string) =>
      Promise.resolve({
        email: `${activePin}@example.com`,
        lastSyncAt: null,
        status: 'connected',
      }),
    )
    mockSyncTickets.mockResolvedValue({ imported: 1, skipped: 0, errors: 0 })

    const { result, rerender } = renderHook(({ p }: { p: string | null }) => useTicketStats(p), {
      initialProps: { p: '111111' },
    })

    await waitFor(() => {
      expect(result.current.stats).toEqual(statsA)
    })

    await act(async () => {
      await result.current.refresh()
    })
    expect(result.current.lastResult).not.toBeNull()

    act(() => {
      rerender({ p: '222222' })
    })

    expect(result.current.stats).toEqual([])
    expect(result.current.connection.status).toBe('disconnected')
    expect(result.current.lastResult).toBeNull()
    expect(result.current.error).toBeNull()

    await waitFor(() => {
      expect(result.current.stats).toEqual(statsB)
      expect(result.current.connection.email).toBe('222222@example.com')
    })
  })

  it('ignora connection obsoleta tras cambio de pin', async () => {
    let resolveFirst!: (value: { email: string; lastSyncAt: null; status: 'connected' }) => void
    const firstPromise = new Promise<{
      email: string
      lastSyncAt: null
      status: 'connected'
    }>((resolve) => {
      resolveFirst = resolve
    })

    mockGetGmailConnectionPublic
      .mockReturnValueOnce(firstPromise)
      .mockResolvedValue({
        email: '222222@example.com',
        lastSyncAt: null,
        status: 'connected',
      })

    const { result, rerender } = renderHook(({ p }: { p: string | null }) => useTicketStats(p), {
      initialProps: { p: '111111' },
    })

    rerender({ p: '222222' })

    await waitFor(() => {
      expect(result.current.connection.email).toBe('222222@example.com')
    })

    resolveFirst({
      email: '111111@example.com',
      lastSyncAt: null,
      status: 'connected',
    })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.connection.email).toBe('222222@example.com')
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
