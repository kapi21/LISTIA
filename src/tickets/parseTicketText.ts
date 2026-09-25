import { displayNameFromRaw, normalizeProductKey } from '../domain/productKey'

const IGNORE_PATTERNS = [
  /^TOTAL\b/i,
  /^TARJETA\b/i,
  /^IVA\b/i,
  /^MERCADONA\b/i,
  /^CIF\b/i,
  /^OP[:\s]/i,
  /^FACTURA\b/i,
  /^BASE\b/i,
  /^CUOTA\b/i,
  /^AUT[:\s]/i,
  /^AID[:\s]/i,
  /^ARC[:\s]/i,
  /^IMPORTE\b/i,
  /^TELEF/i,
  /^SE ADMITEN\b/i,
  /^DESCRIPCI/i,
  /^P\.\s*UNIT/i,
  /^VISA\b/i,
  /^CONTACTLESS\b/i,
  /^AVDA\.?\b/i,
  /^AVENIDA\b/i,
  /^C\/\s*/i,
  /^CALLE\b/i,
  /^PLAZA\b/i,
  /^CTRA\.?\b/i,
]

/** Mercadona line: "1 AGUA LOS RISCOS 2,10" */
const QTY_NAME_PRICE = /^(\d+)\s+(.+?)\s+(\d+[.,]\d{2})\s*$/

function shouldIgnoreLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3) return true
  if (/^\d+([.,]\d+)?$/.test(trimmed)) return true
  if (/^\d{6,}$/.test(trimmed.replace(/\s/g, ''))) return true
  return IGNORE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text)
}

function productFromLine(line: string): { name: string; productKey: string } | null {
  const trimmed = line.trim()
  if (shouldIgnoreLine(trimmed)) return null

  // Mercadona tickets: only lines with qty + name + price (avoids address/footer noise).
  const match = trimmed.match(QTY_NAME_PRICE)
  if (!match) return null

  const name = match[2]!.trim()
  if (!hasLetters(name) || name.length < 2) return null

  return {
    name: displayNameFromRaw(name),
    productKey: normalizeProductKey(name),
  }
}

export function parseTicketText(text: string): { name: string; productKey: string }[] {
  if (!text.trim()) return []

  const seen = new Set<string>()
  const results: { name: string; productKey: string }[] = []

  for (const line of text.split(/\r?\n/)) {
    const product = productFromLine(line)
    if (!product) continue
    if (!product.productKey || seen.has(product.productKey)) continue
    seen.add(product.productKey)
    results.push(product)
  }

  return results
}
