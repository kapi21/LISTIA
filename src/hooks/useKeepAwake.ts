import { useEffect } from 'react'

export function useKeepAwake() {
  useEffect(() => {
    let wakeLock: WakeLockSentinel | null = null

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen')
          wakeLock.addEventListener('release', () => {
            wakeLock = null
          })
        }
      } catch (err) {
        // En algunos navegadores o modos ahorro de batería puede no estar disponible
        console.warn('Wake Lock no disponible:', err)
      }
    }

    // Solicitar bloqueo de apagado
    void requestWakeLock()

    // Volver a solicitar si la app vuelve al primer plano
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestWakeLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLock) {
        void wakeLock.release()
      }
    }
  }, [])
}
