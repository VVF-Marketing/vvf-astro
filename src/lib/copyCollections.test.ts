import { describe, expect, it } from 'vitest'
import { defineCopy } from './copy'
import { CONTENT_COLLECTIONS, FOLDERS } from './cmsNavigation.mjs'
import { COPY_FIELDS, COPY_STRUCTURAL_FIELDS, copyCollectionDefinition, organizeCollections, slotLayout } from './copyCollections.mjs'

describe('copy collection fields', () => {
  it('translates only the value fields', () => {
    expect(COPY_FIELDS.filter((f) => f.translatable !== false).map((f) => f.slug)).toEqual(['value', 'rich_value', 'image_value'])
    expect(COPY_STRUCTURAL_FIELDS).toEqual(expect.arrayContaining(['title', 'key', 'label', 'section', 'position', 'format', 'max_length', 'stale']))
  })

  it('defines a page collection titled by slot, with drafts and revisions', () => {
    const def = copyCollectionDefinition({ route: '/contact', name: 'Contact' })
    expect(def).toMatchObject({ slug: 'copy_contact', label: 'Contact', titleField: 'title', routable: false, supports: ['drafts', 'revisions'] })
    expect(def.admin.listColumns).toEqual([])
    expect(def.fields.find((f: { slug: string }) => f.slug === 'value')).toMatchObject({ type: 'text', searchable: true })
  })
})

describe('slotLayout', () => {
  it('numbers SEO slots first, then content in declaration order', () => {
    const manifest = defineCopy('/x', {
      'hero.heading': { label: 'Hero heading', default: 'a' },
      'hero.text': { label: 'Hero text', default: 'b' },
      'seo.title': { label: 'Title', default: 'c' },
      'seo.description': { label: 'Description', default: 'd' },
    })
    const layout = slotLayout(manifest)
    expect([...layout.values()].map((l) => l.title)).toEqual(['01 · SEO · Title', '02 · SEO · Description', '03 · Content · Hero heading', '04 · Content · Hero text'])
    expect(layout.get('hero.heading')).toEqual({ section: 'content', position: 3, title: '03 · Content · Hero heading' })
  })

  it('pads to three digits for 100+ slots, so title order is page order', () => {
    const slots = Object.fromEntries(Array.from({ length: 105 }, (_, i) => [`k${i}`, { label: `Slot ${i}`, default: '' }]))
    const titles = [...slotLayout(defineCopy('_global', slots)).values()].map((l) => l.title)
    expect(titles[0]).toBe('001 · Content · Slot 0')
    expect([...titles].sort()).toEqual(titles)
  })
})

describe('organizeCollections', () => {
  const collections = [
    { slug: 'page_copy', label: 'Page copy', fields: [] },
    { slug: 'events', label: 'Events', fields: [] },
    { slug: 'pages', label: 'Static pages', fields: [] },
    { slug: 'campaign_settings', label: 'Earthquake relief campaign settings', fields: [{ slug: 'active', label: 'Campaign is active' }, { slug: 'donorbox_campaign_id', label: 'Donorbox campaign ID' }] },
  ]
  const out = organizeCollections(collections, CONTENT_COLLECTIONS)
  const bySlug = Object.fromEntries(out.map((c) => [c.slug, c]))

  it('replaces page_copy with one collection per copy page', () => {
    expect(bySlug.page_copy).toBeUndefined()
    expect(bySlug.copy_home).toMatchObject({ label: 'Home', group: FOLDERS.pages })
    expect(bySlug.copy_site).toMatchObject({ label: 'Site-wide text', group: FOLDERS.pages })
  })

  it('applies folders, labels and hidden', () => {
    expect(bySlug.events).toMatchObject({ group: FOLDERS.collections, hidden: false })
    expect(bySlug.pages).toMatchObject({ hidden: true })
    expect(bySlug.pages.group).toBeUndefined()
    expect(bySlug.campaign_settings).toMatchObject({ label: 'Site banner', group: FOLDERS.banner })
    expect(bySlug.campaign_settings.fields.map((f: { label: string }) => f.label)).toEqual(['Show the banner', 'Donorbox campaign ID'])
  })

  it('is stable when applied twice', () => {
    expect(organizeCollections(out, CONTENT_COLLECTIONS)).toEqual(out)
  })
})
