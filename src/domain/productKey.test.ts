import { describe, expect, it } from 'vitest'
import { displayNameFromRaw, normalizeProductKey } from './productKey'

describe('normalizeProductKey', () => {
  it('minúsculas, sin precio ni espacios dobles', () => {
    expect(normalizeProductKey('  Leche Entera  1,05 € ')).toBe('leche entera')
  })

  it('quita acentos', () => {
    expect(normalizeProductKey('Plátano canario')).toBe('platano canario')
  })
})

describe('displayNameFromRaw', () => {
  it('recorta ruido de precio pero conserva mayúsculas útiles', () => {
    expect(displayNameFromRaw('Leche Entera 1,05 €')).toBe('Leche Entera')
  })
})
