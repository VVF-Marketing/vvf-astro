import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { contentCorrections, fixCopy } from './fixcopy.mjs'

function fakeClient(rows) {
  return {
    listAll: async function* () {
      yield* rows
    },
    update: vi.fn(async () => ({})),
    publish: vi.fn(async () => ({})),
  }
}
const row = (key, value, extra = {}) => ({ id: key, _rev: 'r', data: { key, value }, ...extra })
const corrections = [
  ['_global', 'a', 'wrong', 'right'],
  ['_global', 'b', 'wrong', 'right'],
  ['_global', 'c', 'wrong', 'right'],
  ['_global', 'd', 'wrong', 'right'],
  ['_global', 'e', 'wrong', 'right'],
  ['_global', 'f', 'wrong', 'right'],
]

describe('fixCopy', () => {
  const rows = [row('a', 'wrong'), row('b', 'right'), row('c', 'an editor wrote this'), row('d', 'wrong', { draftRevisionId: 'x' }), row('f', '')]

  it('only reports without --apply', async () => {
    const client = fakeClient(rows)
    const r = await fixCopy({ apply: false, client, corrections, entryCorrections: [], log: () => {} })
    expect(r.fixed).toHaveLength(2)
    expect(client.update).not.toHaveBeenCalled()
  })

  it('fixes exact wrong values and empty slots only, and leaves edits, drafts and missing rows alone', async () => {
    const client = fakeClient(rows)
    const r = await fixCopy({ apply: true, client, corrections, entryCorrections: [], log: () => {} })
    expect(client.update).toHaveBeenCalledTimes(2)
    expect(client.update).toHaveBeenCalledWith('copy_site', 'a', { data: { value: 'right' }, _rev: 'r' })
    expect(client.publish).toHaveBeenCalledWith('copy_site', 'a')
    expect([r.alreadyRight, r.edited.length, r.draft, r.missing]).toEqual([['_global b'], 1, ['_global d'], ['_global e']])
  })
})

// Step 21 (PR #15): Spanish CMS entries loaded with English values.
describe('contentCorrections', () => {
  const img = (id, alt) => ({ provider: 'local', id, alt })
  const seed = {
    content: {
      sponsorship_packages: [
        { id: 'sp-general-trustee', data: { tier_name: 'Trustee', recognition_benefits: ['Board Donor Plaque'] } },
        { id: 'sp-general-trustee--es', locale: 'es', translationOf: 'sp-general-trustee', data: { tier_name: 'Benefactor', recognition_benefits: ['Placa de donante de la junta'] } },
      ],
      events: [
        { id: 'golf', slug: 'golf', data: { hero_image: img('m1', 'Golfers.'), gallery: [img('m1', 'Golfers.')], appeal_cards: [{ title: 'Home', image_alt: 'Families.' }] } },
        {
          id: 'golf--es',
          slug: 'golf',
          locale: 'es',
          translationOf: 'golf',
          data: { hero_image: img('m1', 'Golfistas.'), gallery: [img('m1', 'Golfistas.')], appeal_cards: [{ title: 'Hogar', image_alt: 'Familias.' }] },
        },
      ],
    },
  }

  it('pairs each seed value with the one the old migration loaded', () => {
    expect(contentCorrections(seed)).toEqual([
      { collection: 'sponsorship_packages', id: 'sp-general-trustee--es', slug: undefined, field: 'tier_name', wrong: 'Patrocinador', right: 'Benefactor' },
      { collection: 'sponsorship_packages', id: 'sp-general-trustee--es', slug: undefined, field: 'recognition_benefits', wrong: ['Board Donor Plaque'], right: ['Placa de donante de la junta'] },
      { collection: 'events', id: 'golf--es', slug: 'golf', field: 'hero_image', wrong: img('m1', 'Golfers.'), right: img('m1', 'Golfistas.') },
      { collection: 'events', id: 'golf--es', slug: 'golf', field: 'gallery', wrong: [img('m1', 'Golfers.')], right: [img('m1', 'Golfistas.')] },
      { collection: 'events', id: 'golf--es', slug: 'golf', field: 'appeal_cards', wrong: [{ title: 'Hogar', image_alt: 'Families.' }], right: [{ title: 'Hogar', image_alt: 'Familias.' }] },
    ])
  })

  it('updates an entry once with the fields that still hold the old value, found by slug when it has one', async () => {
    const corrections = contentCorrections(seed)
    const rows = {
      sponsorship_packages: [{ id: 'sp-general-trustee--es', _rev: 'r1', data: { tier_name: 'Patrocinador', recognition_benefits: ['Plaque edited by marketing'] } }],
      events: [{ id: '01CMSID', slug: 'golf', _rev: 'r2', data: { hero_image: img('m1', 'Golfers.'), gallery: [img('m1', 'Golfistas.')], appeal_cards: [{ title: 'Hogar', image_alt: 'Families.' }] } }],
    }
    const client = {
      listAll: async function* (collection) {
        yield* rows[collection] ?? []
      },
      update: vi.fn(async () => ({})),
      publish: vi.fn(async () => ({})),
    }
    const r = await fixCopy({ apply: true, client, corrections: [], entryCorrections: corrections, log: () => {} })
    expect(client.update.mock.calls).toEqual([
      ['sponsorship_packages', 'sp-general-trustee--es', { data: { tier_name: 'Benefactor' }, _rev: 'r1' }],
      ['events', '01CMSID', { data: { hero_image: img('m1', 'Golfistas.'), appeal_cards: [{ title: 'Hogar', image_alt: 'Familias.' }] }, _rev: 'r2' }],
    ])
    expect(r.edited).toEqual(['sponsorship_packages/sp-general-trustee--es recognition_benefits'])
    expect(r.alreadyRight).toEqual(['events/golf--es gallery'])
  })

  it('finds the seed corrections: Benefactor, the four tiers, the Spanish events', () => {
    const fields = contentCorrections(JSON.parse(readFileSync(new URL('../../seed/seed.json', import.meta.url), 'utf8'))).map((c) => `${c.id} ${c.field}`)
    expect(fields).toContain('sp-general-trustee--es tier_name')
    expect(fields.filter((f) => f.includes('_benefits'))).toHaveLength(9)
    expect(fields.filter((f) => f.startsWith('event-2026-golf-tournament--es'))).toContain('event-2026-golf-tournament--es appeal_cards')
  })
})
