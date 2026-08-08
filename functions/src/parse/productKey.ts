export function stripPriceNoise(raw: string): string {
  return raw
    .replace(/\d+[.,]\d{2}\s*€?/g, '')
    .replace(/\b\d+\s*(kg|g|l|ml|ud|uds)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function displayNameFromRaw(raw: string): string {
  return stripPriceNoise(raw)
}

export function normalizeProductKey(raw: string): string {
  const base = stripPriceNoise(raw).toLowerCase()
  return base.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}
