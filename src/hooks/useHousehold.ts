import { useCallback, useEffect, useState } from 'react'
import { sync } from '../data/createSync'
import { clearSession, loadSession, saveSession } from '../data/localDb'
import type { ListSync } from '../data/sync'
import { generatePin, isValidPin, normalizePin } from '../domain/pin'

export type HouseholdStatus = 'loading' | 'idle' | 'ready' | 'error'

export function useHousehold() {
  const [pin, setPin] = useState<string | null>(null)
  const [status, setStatus] = useState<HouseholdStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const saved = await loadSession()
      if (cancelled) return
      if (saved) {
        await sync.joinHousehold(saved)
        setPin(saved)
        setStatus('ready')
      } else {
        setStatus('idle')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const create = useCallback(async () => {
    setError(null)
    const newPin = generatePin()
    await sync.createHousehold(newPin)
    await saveSession(newPin)
    setPin(newPin)
    setStatus('ready')
  }, [])

  const join = useCallback(async (raw: string) => {
    setError(null)
    const normalized = normalizePin(raw)
    if (!isValidPin(normalized)) {
      setError('PIN inválido')
      setStatus('error')
      return
    }
    const ok = await sync.joinHousehold(normalized)
    if (!ok) {
      setError('PIN no encontrado')
      setStatus('error')
      return
    }
    await saveSession(normalized)
    setPin(normalized)
    setStatus('ready')
  }, [])

  const leave = useCallback(async () => {
    await clearSession()
    setPin(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { pin, status, error, create, join, leave, sync: sync as ListSync }
}
