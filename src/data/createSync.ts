import { createFirebaseSync } from './firebaseSync'
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

export function createSync(): SyncConfig {
  if (isFirebaseConfigured()) {
    return { sync: createFirebaseSync(), isLocalMode: false }
  }
  return { sync: createMemorySync(), isLocalMode: true }
}

const config = createSync()

/** Instancia singleton para la app (UI futura). */
export const sync = config.sync
export const isLocalMode = config.isLocalMode
