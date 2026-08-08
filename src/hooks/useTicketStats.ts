import { useCallback, useEffect, useState } from 'react'
import {
  getGmailConnectionPublic,
  startGmailOAuth,
  subscribeTicketStats,
  syncTickets,
  type SyncTicketsResult,
} from '../data/ticketStats'
import type { GmailConnectionPublic, TicketStat } from '../domain/ticketTypes'

const DISCONNECTED: GmailConnectionPublic = {
  email: '',
  lastSyncAt: null,
  status: 'disconnected',
}

export function useTicketStats(pin: string | null) {
  const [stats, setStats] = useState<TicketStat[]>([])
  const [connection, setConnection] = useState<GmailConnectionPublic>(DISCONNECTED)
  const [syncing, setSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncTicketsResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadConnection = useCallback(async (activePin: string, isActive?: () => boolean) => {
    const active = isActive ?? (() => true)
    try {
      const conn = await getGmailConnectionPublic(activePin)
      if (active()) setConnection(conn)
    } catch (e) {
      if (active()) {
        setConnection(DISCONNECTED)
        setError(e instanceof Error ? e.message : 'Error al cargar conexión Gmail')
      }
    }
  }, [])

  useEffect(() => {
    if (!pin) {
      setStats([])
      setConnection(DISCONNECTED)
      setLastResult(null)
      setError(null)
      return
    }

    setStats([])
    setLastResult(null)
    setError(null)
    setConnection(DISCONNECTED)

    let cancelled = false
    const isActive = () => !cancelled

    const unsub = subscribeTicketStats(
      pin,
      (newStats) => {
        if (isActive()) setStats(newStats)
      },
      (message) => {
        if (isActive()) setError(message)
      },
    )
    void loadConnection(pin, isActive)

    return () => {
      cancelled = true
      unsub()
    }
  }, [pin, loadConnection])

  const connect = useCallback(() => {
    if (!pin) return
    setError(null)
    try {
      startGmailOAuth(pin)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo iniciar OAuth')
    }
  }, [pin])

  const refresh = useCallback(async () => {
    if (!pin) return
    setError(null)
    setSyncing(true)
    try {
      const result = await syncTickets(pin)
      setLastResult(result)
      await loadConnection(pin)
    } catch (e) {
      setLastResult(null)
      setError(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }, [pin, loadConnection])

  return { stats, connection, syncing, lastResult, error, connect, refresh }
}
