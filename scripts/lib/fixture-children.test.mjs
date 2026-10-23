import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { MODEL_COLLECTIONS } from '../../src/lib/contentModel.mjs'
import { createHash } from 'node:crypto'
import { FIXTURE_MEDIA, FIXTURE_PHOTO, fixtureChildren, withFixtureChildren } from './fixture-children.mjs'
import { mediaValueFor } from './seed-media.mjs'

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

  it('uses the illustrated placeholder, never a seed photo', () => {
    for (const c of withFixtureChildren(seed).content.children) expect(c.data.photo.id).toBe(FIXTURE_PHOTO.id)
  })

  it('describes the placeholder as mediaValueFor() would, and as the file is', async () => {
    const entry = Object.values(FIXTURE_MEDIA)[0]
    const { alt, ...value } = await mediaValueFor(entry)
    expect(value).toEqual(FIXTURE_PHOTO)
    const file = readFileSync(new URL(`../../${entry.path}`, import.meta.url))
    expect([file.length, createHash('sha256').update(file).digest('hex')]).toEqual([entry.bytes, entry.sha256])
  })

  it('never touches the committed public seed', () => {
    expect(seed.content.children ?? []).toEqual([])
  })
})
