import { displayNameFromRaw, normalizeProductKey, stripPriceNoise } from '../domain/productKey'

const IGNORE_PATTERNS = [/^TOTAL\b/i, /^TARJETA\b/i, /^IVA\b/i, /^MERCADONA\b/i]

function shouldIgnoreLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.length < 3) return true
  if (/^\d+([.,]\d+)?$/.test(trimmed)) return true
  return IGNORE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text)
}

export function parseTicketText(text: string): { name: string; productKey: string }[] {
  if (!text.trim()) return []

  const seen = new Set<string>()
  const results: { name: string; productKey: string }[] = []

  for (const line of text.split(/\r?\n/)) {
    if (shouldIgnoreLine(line)) continue

    const cleaned = stripPriceNoise(line.trim())
    if (!hasLetters(cleaned)) continue

    const productKey = normalizeProductKey(line)
    if (seen.has(productKey)) continue
    seen.add(productKey)

    results.push({
      name: displayNameFromRaw(line),
      productKey,
    })
  }

  return results
}
