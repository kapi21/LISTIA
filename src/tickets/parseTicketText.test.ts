// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTicketText } from './parseTicketText'

describe('parseTicketText', () => {
  it('extrae productos e ignora TOTAL', () => {
    const text = readFileSync(new URL('./fixtures/sample-ticket.txt', import.meta.url), 'utf8')
    const lines = parseTicketText(text)
    expect(lines.map((l) => l.productKey)).toEqual(['leche entera hacendado', 'pan de molde'])
  })

  it('texto vacío → []', () => {
    expect(parseTicketText('')).toEqual([])
  })
})
