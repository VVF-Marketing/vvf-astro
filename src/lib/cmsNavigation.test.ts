import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CopyManifest } from './copy'
import { COPY_PAGES, FOLDERS, copyCollectionFor, isCopyCollection, sidebarSettings } from './cmsNavigation.mjs'

const MANIFESTS = Object.values(
  import.meta.glob<{ default: CopyManifest | CopyManifest[] }>(
    ['/src/pages/**/_copy.ts', '/src/pages/**/_copy.detail.ts', '/src/copy/_copy.ts'],
    { eager: true }
  )
).flatMap((m) => (Array.isArray(m.default) ? m.default : [m.default]))

describe('copyCollectionFor', () => {
  it('derives readable slugs', () => {
    expect(copyCollectionFor('/')).toBe('copy_home')
    expect(copyCollectionFor('_global')).toBe('copy_site')
    expect(copyCollectionFor('/ways-to-give')).toBe('copy_ways_to_give')
    expect(copyCollectionFor('/events/*')).toBe('copy_events_detail')
    expect(copyCollectionFor('/resources/category/financials-transparency')).toBe('copy_resources_financials')
  })

  it('gives every copy page a valid, unique EmDash slug', () => {
    const slugs = COPY_PAGES.map((p) => copyCollectionFor(p.route))
    for (const slug of slugs) expect(slug).toMatch(/^[a-z][a-z0-9_]{0,62}$/)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(isCopyCollection('copy_home')).toBe(true)
    expect(isCopyCollection('events')).toBe(false)
  })
})

describe('copy pages match the manifests in code', () => {
  const routes = MANIFESTS.map((m) => m.route)

  it('has one manifest per route', () => {
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('lists every manifest exactly once, and nothing else', () => {
    expect(COPY_PAGES.map((p) => p.route).sort()).toEqual([...routes].sort())
  })
})

describe('sidebar settings', () => {
  const settings = sidebarSettings()
  const seed = JSON.parse(readFileSync(path.join(process.cwd(), 'seed/seed.json'), 'utf8')) as { collections: { slug: string }[] }

  it('puts every seed collection in a folder or hides it', () => {
    const unplaced = seed.collections
      .map((c) => c.slug)
      .filter((slug) => !settings[slug] || (!settings[slug].hidden && !Object.values(FOLDERS).includes(settings[slug].group)))
    expect(unplaced).toEqual([])
  })

  it('configures only collections that exist', () => {
    const slugs = new Set(seed.collections.map((c) => c.slug))
    expect(Object.keys(settings).filter((s) => !slugs.has(s))).toEqual([])
  })

  it('orders the folders Pages & SEO, CMS collections, Banner', () => {
    const firstSeen: string[] = []
    for (const s of Object.values(settings).filter((s) => !s.hidden).sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (!firstSeen.includes(s.group)) firstSeen.push(s.group)
    }
    expect(firstSeen).toEqual([FOLDERS.pages, FOLDERS.collections, FOLDERS.banner])
  })

  it('describes every visible collection', () => {
    for (const s of Object.values(settings).filter((s) => !s.hidden)) expect(s.description?.length).toBeGreaterThan(20)
  })

  it('ends Pages & SEO with the site-wide text', () => {
    const pages = Object.values(settings).filter((s) => s.group === FOLDERS.pages).sort((a, b) => a.sortOrder - b.sortOrder)
    expect(pages.at(-1)?.label).toBe('Site-wide text')
  })
})
