// @vitest-environment node
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseTicketText } from './parseTicketText'

describe('parseTicketText', () => {
  it('extrae productos e ignora TOTAL', () => {
    const text = readFileSync(new URL('./fixtures/sample-ticket.txt', import.meta.url), 'utf8')
    const lines = parseTicketText(text)
    expect(lines.map((l) => l.productKey)).toEqual([
      'agua los riscos',
      'conos',
      'burger pollo cert',
    ])
  })

  it('texto vacío → []', () => {
    expect(parseTicketText('')).toEqual([])
  })
})
