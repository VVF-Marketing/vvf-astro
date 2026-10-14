import { describe, expect, it } from 'vitest'
import { publishTarget, requiredSpanishFields, spanishIncompleteError, type SpanishLookup } from './spanishComplete'

const items: Record<string, { locale: string; data: Record<string, unknown> }> = {
  en1: { locale: 'en', data: { question: 'Q?', answer: 'A.' } },
  es1: { locale: 'es', data: { question: '¿P?', answer: '' } },
  en2: { locale: 'en', data: { question: 'Q2?' } },
  en3: { locale: 'en', data: { question: 'Q3?' } },
  es3: { locale: 'es', data: { question: '¿P3?', answer: 'R.' } },
}
const groups: Record<string, string[]> = { en1: ['en1', 'es1'], es1: ['en1', 'es1'], en2: ['en2'], en3: ['en3', 'es3'] }
const lookup: SpanishLookup = {
  get: async (_c, id) => items[id],
  translations: async (_c, id) => (groups[id] ?? []).map((t) => ({ id: t, locale: items[t].locale })),
}

describe('Spanish-complete publishing', () => {
  it('requires the per-language required fields of a content type', () => {
    expect(requiredSpanishFields('faqs').map((f) => f.slug)).toEqual(expect.arrayContaining(['question']))
    expect(requiredSpanishFields('copy_home')).toEqual([])
  })

  it('recognizes publishing calls only', () => {
    expect(publishTarget({ tool: 'content_publish', args: { collection: 'faqs', id: 'en1' } })).toEqual({ collection: 'faqs', id: 'en1', locale: undefined })
    expect(publishTarget({ tool: 'content_update', args: { collection: 'faqs', id: 'en1', status: 'draft' } })).toBeUndefined()
    expect(publishTarget({ tool: 'content_publish', args: { collection: 'copy_home', id: 'x' } })).toBeUndefined()
  })

  it('refuses while the Spanish version is missing or incomplete', async () => {
    expect(await spanishIncompleteError({ collection: 'faqs', id: 'en2' }, lookup)).toMatch(/Add the Spanish version/)
    expect(await spanishIncompleteError({ collection: 'faqs', id: 'en1' }, lookup)).toMatch(/Still empty: .*Answer/i)
    expect(await spanishIncompleteError({ collection: 'faqs' }, lookup)).toMatch(/Spanish version/)
  })

  it('allows a complete Spanish version, and publishing the Spanish item itself', async () => {
    expect(await spanishIncompleteError({ collection: 'faqs', id: 'en3' }, lookup)).toBeUndefined()
    expect(await spanishIncompleteError({ collection: 'faqs', id: 'es1' }, lookup)).toBeUndefined()
    expect(await spanishIncompleteError({ collection: 'faqs', id: 'x', locale: 'es' }, lookup)).toBeUndefined()
  })
})
