import { createMemorySync, type ListSync } from './sync'

function isFirebaseConfigured(): boolean {
  const env = import.meta.env
  return Boolean(
    env.VITE_FIREBASE_API_KEY &&
      env.VITE_FIREBASE_AUTH_DOMAIN &&
      env.VITE_FIREBASE_PROJECT_ID &&
      env.VITE_FIREBASE_STORAGE_BUCKET &&
      env.VITE_FIREBASE_MESSAGING_SENDER_ID &&
      env.VITE_FIREBASE_APP_ID,
  )
}

export type SyncConfig = {
  sync: ListSync
  isLocalMode: boolean
}

export const isLocalMode = !isFirebaseConfigured()

let syncInstance: ListSync | undefined
let syncReady: Promise<ListSync> | undefined

/** Carga sync (Firebase solo si está configurado; import dinámico evita bundle en modo local). */
export function getSync(): Promise<ListSync> {
  if (syncInstance) return Promise.resolve(syncInstance)
  if (!syncReady) {
    syncReady = (async () => {
      if (isFirebaseConfigured()) {
        const { createFirebaseSync } = await import('./firebaseSync')
        syncInstance = createFirebaseSync()
      } else {
        syncInstance = createMemorySync()
      }
      return syncInstance
    })()
  }
  return syncReady
}
