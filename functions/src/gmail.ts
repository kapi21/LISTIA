import { google } from 'googleapis'
import type { gmail_v1 } from 'googleapis'
import { config } from './config'

/** Adjust `from:` after testing with a real Mercadona receipt email. */
export const MERCADONA_GMAIL_QUERY =
  'from:mercadona.es has:attachment filename:pdf'

export type GmailAuthClient = InstanceType<typeof google.auth.OAuth2>

function createOAuth2Client(refreshToken?: string): GmailAuthClient {
  const client = new google.auth.OAuth2(
    config.gmailClientId,
    config.gmailClientSecret,
    config.gmailRedirectUri,
  )
  if (refreshToken) {
    client.setCredentials({ refresh_token: refreshToken })
  }
  return client
}

export function createOAuth2ClientFromRefreshToken(refreshToken: string): GmailAuthClient {
  return createOAuth2Client(refreshToken)
}

export async function listMercadonaPdfMessages(
  auth: GmailAuthClient,
): Promise<{ id: string; internalDate: number }[]> {
  const gmail = google.gmail({ version: 'v1', auth })
  const results: { id: string; internalDate: number }[] = []
  let pageToken: string | undefined

  do {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: MERCADONA_GMAIL_QUERY,
      maxResults: 100,
      pageToken,
    })

    const messages = response.data.messages ?? []
    for (const message of messages) {
      if (!message.id) continue

      const detail = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'metadata',
      })

      results.push({
        id: message.id,
        internalDate: Number(detail.data.internalDate ?? Date.now()),
      })
    }

    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  return results
}

function decodeBase64Url(data: string): Buffer {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64')
}

function findFirstPdfPart(
  parts: gmail_v1.Schema$MessagePart[] | undefined,
): gmail_v1.Schema$MessagePart | null {
  if (!parts) return null

  for (const part of parts) {
    const filename = part.filename?.toLowerCase() ?? ''
    const mimeType = part.mimeType?.toLowerCase() ?? ''
    const isPdf =
      filename.endsWith('.pdf') ||
      mimeType === 'application/pdf' ||
      mimeType === 'application/x-pdf'

    if (isPdf && (part.body?.attachmentId || part.body?.data)) {
      return part
    }

    const nested = findFirstPdfPart(part.parts ?? undefined)
    if (nested) return nested
  }

  return null
}

export async function downloadFirstPdf(
  auth: GmailAuthClient,
  messageId: string,
): Promise<Buffer | null> {
  const gmail = google.gmail({ version: 'v1', auth })
  const response = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const pdfPart = findFirstPdfPart(response.data.payload?.parts ?? undefined)
  if (!pdfPart?.body) return null

  if (pdfPart.body.data) {
    return decodeBase64Url(pdfPart.body.data)
  }

  if (!pdfPart.body.attachmentId) return null

  const attachment = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: pdfPart.body.attachmentId,
  })

  if (!attachment.data.data) return null
  return decodeBase64Url(attachment.data.data)
}

export function isGmailAuthError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false

  const err = error as {
    code?: number | string
    message?: string
    response?: { data?: { error?: string; error_description?: string } }
  }

  const apiError = err.response?.data?.error
  if (apiError === 'invalid_grant' || apiError === 'invalid_token') {
    return true
  }

  const message = `${err.message ?? ''} ${err.response?.data?.error_description ?? ''}`.toLowerCase()
  return (
    message.includes('invalid_grant') ||
    message.includes('invalid_token') ||
    err.code === 401
  )
}
