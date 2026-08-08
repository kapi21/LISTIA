import * as admin from 'firebase-admin'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

export const config = {
  get gmailClientId(): string {
    return requireEnv('GMAIL_CLIENT_ID')
  },
  get gmailClientSecret(): string {
    return requireEnv('GMAIL_CLIENT_SECRET')
  },
  get gmailRedirectUri(): string {
    return requireEnv('GMAIL_REDIRECT_URI')
  },
  get pwaOrigin(): string {
    return requireEnv('PWA_ORIGIN')
  },
  get oauthStateSecret(): string {
    return requireEnv('OAUTH_STATE_SECRET')
  },
}

if (!admin.apps.length) {
  admin.initializeApp()
}

export const db = admin.firestore()
