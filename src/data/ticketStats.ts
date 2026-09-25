import type { GmailConnectionPublic, TicketStat } from '../domain/ticketTypes'

export type SyncTicketsResult = {
  imported: number
  skipped: number
  errors: number
  found?: number
  scanned?: number
  hasMore?: boolean
  query?: string
}

const DISCONNECTED_CONNECTION: GmailConnectionPublic = {
  email: '',
  lastSyncAt: null,
  status: 'disconnected',
}

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

function getFunctionsBaseUrl(): string | null {
  const raw = import.meta.env.VITE_FUNCTIONS_BASE_URL
  if (!raw || !String(raw).trim()) return null
  return String(raw).replace(/\/$/, '')
}

function ticketsUnavailableMessage(): string {
  if (!isFirebaseConfigured()) {
    return 'Firebase no configurado: sincronización de tickets no disponible'
  }
  if (!getFunctionsBaseUrl()) {
    return 'VITE_FUNCTIONS_BASE_URL no configurada: sincronización de tickets no disponible'
  }
  return 'Sincronización de tickets no disponible'
}

async function getFirestoreDb() {
  const [{ getApps, getApp, initializeApp }, { getFirestore }] = await Promise.all([
    import('firebase/app'),
    import('firebase/firestore'),
  ])
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(config)
  return getFirestore(app)
}

export function subscribeTicketStats(
  pin: string,
  onChange: (stats: TicketStat[]) => void,
  onError?: (message: string) => void,
): () => void {
  if (!isFirebaseConfigured()) {
    onChange([])
    return () => {}
  }

  let unsub: (() => void) | undefined
  let cancelled = false

  void (async () => {
    const [{ collection, onSnapshot }, db] = await Promise.all([
      import('firebase/firestore'),
      getFirestoreDb(),
    ])
    if (cancelled) return

    unsub = onSnapshot(
      collection(db, 'households', pin, 'ticketStats'),
      (snap) => {
        const stats = snap.docs
          .map((d) => {
            const data = d.data()
            return {
              productKey: d.id,
              name: String(data.name ?? ''),
              count: Number(data.count ?? 0),
              lastPurchasedAt: Number(data.lastPurchasedAt ?? 0),
            } satisfies TicketStat
          })
          .sort((a, b) => b.count - a.count || b.lastPurchasedAt - a.lastPurchasedAt)
        onChange(stats)
      },
      (err) => {
        onChange([])
        onError?.(err instanceof Error ? err.message : 'Error al cargar estadísticas')
      },
    )
  })()

  return () => {
    cancelled = true
    unsub?.()
  }
}

export async function getGmailConnectionPublic(pin: string): Promise<GmailConnectionPublic> {
  if (!isFirebaseConfigured()) {
    return DISCONNECTED_CONNECTION
  }

  const [{ doc, getDoc }, db] = await Promise.all([
    import('firebase/firestore'),
    getFirestoreDb(),
  ])

  const snap = await getDoc(doc(db, 'households', pin, 'gmailConnectionPublic', 'current'))
  if (!snap.exists()) {
    return DISCONNECTED_CONNECTION
  }

  const data = snap.data()
  const status = data.status
  const validStatus =
    status === 'connected' || status === 'needs_reauth' || status === 'disconnected'
      ? status
      : 'disconnected'

  return {
    email: String(data.email ?? ''),
    lastSyncAt: data.lastSyncAt == null ? null : Number(data.lastSyncAt),
    status: validStatus,
  }
}

export function startGmailOAuth(pin: string): void {
  const base = getFunctionsBaseUrl()
  if (!base) {
    throw new Error(ticketsUnavailableMessage())
  }
  window.location.assign(`${base}/gmailStart?pin=${encodeURIComponent(pin)}`)
}

export async function syncTickets(pin: string): Promise<SyncTicketsResult> {
  const base = getFunctionsBaseUrl()
  if (!isFirebaseConfigured() || !base) {
    throw new Error(ticketsUnavailableMessage())
  }

  const res = await fetch(`${base}/syncTickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  })

  if (!res.ok) {
    let message = `Error al sincronizar (${res.status})`
    try {
      const body = (await res.json()) as { error?: string }
      if (body.error) message = body.error
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message)
  }

  return (await res.json()) as SyncTicketsResult
}
