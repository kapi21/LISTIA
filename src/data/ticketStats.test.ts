import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { syncTickets } from './ticketStats'

describe('syncTickets', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_FIREBASE_API_KEY', 'key')
    vi.stubEnv('VITE_FIREBASE_AUTH_DOMAIN', 'domain')
    vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'project')
    vi.stubEnv('VITE_FIREBASE_STORAGE_BUCKET', 'bucket')
    vi.stubEnv('VITE_FIREBASE_MESSAGING_SENDER_ID', 'sender')
    vi.stubEnv('VITE_FIREBASE_APP_ID', 'app')
    vi.stubEnv('VITE_FUNCTIONS_BASE_URL', 'https://example.test/functions')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('POST a /syncTickets y devuelve el resultado', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ imported: 3, skipped: 2, errors: 1 }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await syncTickets('654321')

    expect(fetchMock).toHaveBeenCalledWith('https://example.test/functions/syncTickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: '654321' }),
    })
    expect(result).toEqual({ imported: 3, skipped: 2, errors: 1 })
  })

  it('lanza error claro sin VITE_FUNCTIONS_BASE_URL', async () => {
    vi.stubEnv('VITE_FUNCTIONS_BASE_URL', '')

    await expect(syncTickets('654321')).rejects.toThrow(
      'VITE_FUNCTIONS_BASE_URL no configurada',
    )
  })
})
