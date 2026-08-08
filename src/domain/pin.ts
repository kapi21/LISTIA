export function normalizePin(input: string): string {
  return input.replace(/\D/g, '')
}

export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin)
}

export function generatePin(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000
  return String(n).padStart(6, '0')
}
