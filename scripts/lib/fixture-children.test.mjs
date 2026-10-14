import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MODEL_COLLECTIONS } from '../../src/lib/contentModel.mjs'
import { fixtureChildren, withFixtureChildren } from './fixture-children.mjs'

const seed = JSON.parse(readFileSync(new URL('../../seed/seed.json', import.meta.url), 'utf8'))

describe('fixture children', () => {
  it('adds made-up profiles in both languages to a seed without children', () => {
    const out = withFixtureChildren(seed)
    const children = out.content.children
    const en = children.filter((c) => !c.locale)
    const es = children.filter((c) => c.locale === 'es')
    expect(en.length).toBeGreaterThan(4)
    expect(es.map((c) => c.translationOf).sort()).toEqual(en.map((c) => c.id).sort())
    for (const c of en) expect(c.slug).toMatch(/^fixture-/)
    // Enough for the list filters: both lower age ranges, and one not available.
    expect(en.some((c) => c.data.age <= 5) && en.some((c) => c.data.age >= 6 && c.data.age <= 10)).toBe(true)
    expect(en.some((c) => c.data.sponsorship_status !== 'available')).toBe(true)
    expect(en.some((c) => !c.data.birth_date)).toBe(true)
  })

  it('uses only the content model fields', () => {
    const fields = new Set(MODEL_COLLECTIONS.find((c) => c.slug === 'children').fields.map((f) => f.slug))
    for (const c of fixtureChildren({ id: 'x' })) for (const k of Object.keys(c.data)) expect(fields, k).toContain(k)
  })

  it('leaves a seed with real children alone', () => {
    const real = { ...seed, content: { ...seed.content, children: [{ id: 'child-a', slug: 'a', data: {} }] } }
    expect(withFixtureChildren(real)).toBe(real)
  })

  it('never touches the committed public seed', () => {
    expect(seed.content.children ?? []).toEqual([])
  })
})
