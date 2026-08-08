import crypto from 'crypto'
import { google } from 'googleapis'
import { FieldValue } from 'firebase-admin/firestore'
import { config, db } from './config'

const GMAIL_READONLY_SCOPE = 'https://www.googleapis.com/auth/gmail.readonly'

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

export function signOAuthState(pin: string): string {
  const hmac = crypto
    .createHmac('sha256', config.oauthStateSecret)
    .update(pin)
    .digest('hex')
  return `${pin}.${hmac}`
}

export function verifyOAuthState(state: string): string | null {
  const dot = state.lastIndexOf('.')
  if (dot <= 0) return null

  const pin = state.slice(0, dot)
  const signature = state.slice(dot + 1)
  if (!isValidPin(pin)) return null

  const expected = crypto
    .createHmac('sha256', config.oauthStateSecret)
    .update(pin)
    .digest('hex')

  const sigBuf = Buffer.from(signature, 'utf8')
  const expectedBuf = Buffer.from(expected, 'utf8')
  if (sigBuf.length !== expectedBuf.length) return null
  if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null

  return pin
}

function createOAuth2Client() {
  return new google.auth.OAuth2(
    config.gmailClientId,
    config.gmailClientSecret,
    config.gmailRedirectUri,
  )
}

export function getGmailAuthUrl(pin: string): string {
  const oauth2Client = createOAuth2Client()
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GMAIL_READONLY_SCOPE],
    state: signOAuthState(pin),
  })
}

export async function exchangeCodeAndSaveConnection(
  code: string,
  state: string,
): Promise<{ pin: string; email: string }> {
  const pin = verifyOAuthState(state)
  if (!pin) {
    throw new Error('Invalid OAuth state')
  }

  const oauth2Client = createOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.refresh_token) {
    throw new Error('No refresh token returned; revoke app access and retry')
  }

  oauth2Client.setCredentials(tokens)

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const email = profile.data.emailAddress
  if (!email) {
    throw new Error('Could not read Gmail profile email')
  }

  await db.doc(`households/${pin}/gmailConnection`).set({
    email,
    refreshToken: tokens.refresh_token,
    status: 'connected',
    lastSyncAt: null,
    connectedAt: FieldValue.serverTimestamp(),
  })

  return { pin, email }
}
