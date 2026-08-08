import { describe, expect, it } from 'vitest'
import { generatePin, isValidPin, normalizePin } from './pin'

describe('pin', () => {
  it('normaliza quitando espacios y no dígitos', () => {
    expect(normalizePin(' 48-29 10 ')).toBe('482910')
  })

  it('valida exactamente 6 dígitos', () => {
    expect(isValidPin('482910')).toBe(true)
    expect(isValidPin('48291')).toBe(false)
    expect(isValidPin('48291a')).toBe(false)
  })

  it('generatePin produce 6 dígitos', () => {
    const pin = generatePin()
    expect(pin).toMatch(/^\d{6}$/)
  })
})
