import { useCallback, useEffect, useState } from 'react'
import { getSync, isLocalMode } from '../data/createSync'
import { clearSession, loadSession, saveSession } from '../data/localDb'
import type { ListSync } from '../data/sync'
import { generatePin, isValidPin, normalizePin } from '../domain/pin'

export type HouseholdStatus = 'loading' | 'idle' | 'ready' | 'error'

export { isLocalMode }

export function useHousehold() {
  const [pin, setPin] = useState<string | null>(null)
  const [status, setStatus] = useState<HouseholdStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [sync, setSync] = useState<ListSync | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const listSync = await getSync()
      if (cancelled) return
      setSync(listSync)
      const saved = await loadSession()
      if (cancelled) return
      if (saved) {
        await listSync.joinHousehold(saved)
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
    if (!sync) return
    setError(null)
    const newPin = generatePin()
    await sync.createHousehold(newPin)
    await saveSession(newPin)
    setPin(newPin)
    setStatus('ready')
  }, [sync])

  const join = useCallback(
    async (raw: string) => {
      if (!sync) return
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
    },
    [sync],
  )

  const leave = useCallback(async () => {
    await clearSession()
    setPin(null)
    setStatus('idle')
    setError(null)
  }, [])

  return { pin, status, error, create, join, leave, sync }
}
