import pdfParseModule from 'pdf-parse'
import { FieldValue } from 'firebase-admin/firestore'
import { db } from './config'
import {
  createOAuth2ClientFromRefreshToken,
  downloadFirstPdf,
  type GmailAuthClient,
  isGmailAuthError,
  listMercadonaPdfMessages,
} from './gmail'
import { parseTicketText } from './parse/parseTicketText'

const pdfParse = pdfParseModule as unknown as (data: Buffer) => Promise<{ text: string }>

export type ImportSummary = {
  imported: number
  skipped: number
  errors: number
}

async function markNeedsReauth(pin: string): Promise<void> {
  await db.doc(`households/${pin}/gmailConnectionPublic/current`).set(
    { status: 'needs_reauth' },
    { merge: true },
  )
}

async function isMessageImported(pin: string, messageId: string): Promise<boolean> {
  const snap = await db.doc(`households/${pin}/importedMessages/${messageId}`).get()
  return snap.exists
}

async function recordImportedMessage(
  pin: string,
  messageId: string,
  status: 'ok' | 'error',
  error?: string,
): Promise<void> {
  await db.doc(`households/${pin}/importedMessages/${messageId}`).set({
    importedAt: FieldValue.serverTimestamp(),
    status,
    ...(error ? { error } : {}),
  })
}

async function applyTicketProducts(
  pin: string,
  products: { name: string; productKey: string }[],
  purchasedAt: number,
): Promise<void> {
  if (products.length === 0) return

  const refs = products.map((product) =>
    db.doc(`households/${pin}/ticketStats/${product.productKey}`),
  )
  const existingSnaps = await db.getAll(...refs)
  const existingByKey = new Map(
    existingSnaps.map((snap) => [snap.id, snap.data() as { lastPurchasedAt?: number } | undefined]),
  )

  const batch = db.batch()
  for (const product of products) {
    const existing = existingByKey.get(product.productKey)
    const lastPurchasedAt = Math.max(existing?.lastPurchasedAt ?? 0, purchasedAt)

    batch.set(
      db.doc(`households/${pin}/ticketStats/${product.productKey}`),
      {
        productKey: product.productKey,
        name: product.name,
        count: FieldValue.increment(1),
        lastPurchasedAt,
      },
      { merge: true },
    )
  }

  await batch.commit()
}

async function importMessage(
  pin: string,
  auth: GmailAuthClient,
  message: { id: string; internalDate: number },
): Promise<'imported' | 'skipped' | 'error'> {
  if (await isMessageImported(pin, message.id)) {
    return 'skipped'
  }

  try {
    const pdfBuffer = await downloadFirstPdf(auth, message.id)
    if (!pdfBuffer) {
      await recordImportedMessage(pin, message.id, 'error', 'No PDF attachment found')
      return 'error'
    }

    const parsed = await pdfParse(pdfBuffer)
    const products = parseTicketText(parsed.text)
    if (products.length === 0) {
      await recordImportedMessage(pin, message.id, 'error', 'No products parsed from PDF')
      return 'error'
    }

    await applyTicketProducts(pin, products, message.internalDate)
    await recordImportedMessage(pin, message.id, 'ok')
    return 'imported'
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Unknown import error'
    await recordImportedMessage(pin, message.id, 'error', messageText)
    return 'error'
  }
}

export async function importNewTickets(pin: string): Promise<ImportSummary> {
  const secretsSnap = await db.doc(`households/${pin}/gmailSecrets/gmail`).get()
  if (!secretsSnap.exists) {
    throw new Error('Gmail not connected')
  }

  const refreshToken = secretsSnap.data()?.refreshToken
  if (typeof refreshToken !== 'string' || !refreshToken) {
    throw new Error('Gmail refresh token missing')
  }

  const auth = createOAuth2ClientFromRefreshToken(refreshToken)
  let messages: { id: string; internalDate: number }[]

  try {
    messages = await listMercadonaPdfMessages(auth)
  } catch (error) {
    if (isGmailAuthError(error)) {
      await markNeedsReauth(pin)
      throw new Error('Gmail authentication expired; reconnect required')
    }
    throw error
  }

  const summary: ImportSummary = { imported: 0, skipped: 0, errors: 0 }

  for (const message of messages) {
    let outcome: 'imported' | 'skipped' | 'error'
    try {
      outcome = await importMessage(pin, auth, message)
    } catch (error) {
      if (isGmailAuthError(error)) {
        await markNeedsReauth(pin)
        throw new Error('Gmail authentication expired; reconnect required')
      }
      outcome = 'error'
      await recordImportedMessage(
        pin,
        message.id,
        'error',
        error instanceof Error ? error.message : 'Unknown import error',
      )
    }

    if (outcome === 'imported') summary.imported += 1
    else if (outcome === 'skipped') summary.skipped += 1
    else summary.errors += 1
  }

  await db.doc(`households/${pin}/gmailConnectionPublic/current`).set(
    {
      lastSyncAt: Date.now(),
      status: 'connected',
    },
    { merge: true },
  )

  return summary
}
