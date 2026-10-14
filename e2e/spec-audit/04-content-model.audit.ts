// Spec section 4: content model (checks 4.4-1, 4.4-3, 4.5-1, 4.5-3 to 4.5-8).
// 4.5-1 compares the EmDash schema in seed/seed.json with the spec's
// Appendix B, read from the gitignored .spec-audit/appendix-b.yaml.
// 4.5-3..8 run the content adapter (src/lib/content) on items built here
// in the target model, with EmDash mocked (design D5).
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const root = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url))
const schema = JSON.parse(readFileSync(root('seed/seed.json'), 'utf8')) as {
  collections: { slug: string; fields: { slug: string; type: string; required?: boolean | null }[] }[]
}
const localSeed = existsSync(root('seed/seed.local.json')) ? root('seed/seed.local.json') : root('seed/seed.json')
const content = (JSON.parse(readFileSync(localSeed, 'utf8')) as { content: Record<string, any[]> }).content

// --- Appendix B -----------------------------------------------------------

type FieldSpec = { type: string; required?: boolean }

// Appendix B uses a fixed indentation: type (0), its keys (2), field names
// under `fields:` (4), field keys (6). Enough YAML for that shape.
export function parseAppendixB(yaml: string): Record<string, Record<string, FieldSpec>> {
  const types: Record<string, Record<string, FieldSpec>> = {}
  let type = ''
  let inFields = false
  let field = ''
  for (const line of yaml.split('\n')) {
    const m = line.match(/^( *)([a-z_]+):(?: (.*))?$/)
    if (!m) continue
    const [, indent, key, raw] = m
    const value = raw?.replace(/^'(.*)'$/, '$1')
    if (indent.length === 0) (type = key), (types[type] = {}), (inFields = false)
    else if (indent.length === 2) inFields = key === 'fields'
    else if (indent.length === 4 && inFields) (field = key), (types[type][field] = { type: '' })
    else if (indent.length === 6 && inFields && field) {
      if (key === 'type') types[type][field].type = value ?? ''
      if (key === 'required') types[type][field].required = value === 'true'
    }
  }
  return types
}

// Target collection per Appendix B type.
const COLLECTION: Record<string, string> = {
  event: 'events',
  event_offer: 'event_offers',
  benefit_row: 'benefit_rows',
  auction_item: 'auction_items',
  testimonial: 'testimonials',
  faq: 'faqs',
  child: 'children',
  team_member: 'team_members',
  article: 'articles',
  category: 'categories',
  author: 'authors',
  partner: 'partners',
  site_fact: 'site_facts',
}

// EmDash field types that can hold each Appendix B type.
function compatible(specType: string, emdashType: string): boolean {
  const t = specType.replace(/\[.*$/, '')
  const ok: Record<string, string[]> = {
    string: ['string', 'text'],
    richtext: ['portableText'],
    integer: ['integer'],
    boolean: ['boolean'],
    date: ['datetime'],
    datetime: ['datetime'],
    email: ['string'],
    phone: ['string'],
    url: ['url', 'string'],
    video_url: ['url', 'string'],
    image: ['image'],
    file: ['file'],
    enum: ['select'],
    set: ['multiSelect'],
    ref: ['reference'],
    ordered_refs: ['json', 'repeater', 'reference'],
    list: specType.startsWith('list[enum') ? ['multiSelect'] : ['repeater', 'json'],
    map: ['json'],
  }
  return (ok[t] ?? []).includes(emdashType)
}

const appendixPath = root('.spec-audit/appendix-b.yaml')

describe('[4.5-1] content types and fields match Appendix B', () => {
  it.skipIf(!existsSync(appendixPath))('every type and field exists with its type and required flag', () => {
    const spec = parseAppendixB(readFileSync(appendixPath, 'utf8'))
    const problems: string[] = []
    for (const [type, fields] of Object.entries(spec)) {
      const collection = schema.collections.find((c) => c.slug === COLLECTION[type])
      if (!collection) {
        problems.push(`${type}: no collection "${COLLECTION[type]}"`)
        continue
      }
      for (const [name, f] of Object.entries(fields)) {
        // slug is EmDash's own entry slug; derived fields aren't stored.
        if (name === 'slug' || f.type === 'derived') continue
        const actual = collection.fields.find((x) => x.slug === name)
        if (!actual) problems.push(`${type}.${name}: missing (${f.type})`)
        else if (!compatible(f.type, actual.type)) problems.push(`${type}.${name}: ${actual.type}, spec ${f.type}`)
        else if (f.required && !actual.required) problems.push(`${type}.${name}: not required`)
      }
    }
    expect(problems).toEqual([])
  })
})

// --- Migration content (4.4) ------------------------------------------------

describe('[4.4-1] every migrated item exists in Spanish', () => {
  it('each English item has a Spanish translation', () => {
    const missing: string[] = []
    for (const [collection, entries] of Object.entries(content)) {
      if (collection.startsWith('copy_') || collection === 'pages') continue
      // A collection with nothing to translate (e.g. the Donorbox campaign IDs) has one entry for both languages.
      const fields = (schema.collections.find((c) => c.slug === collection)?.fields ?? []) as { translatable?: boolean }[]
      if (fields.length && fields.every((f) => f.translatable === false)) continue
      const translated = new Set(entries.filter((e) => e.locale === 'es').map((e) => e.translationOf))
      for (const e of entries.filter((e) => !e.locale)) if (!translated.has(e.id)) missing.push(`${collection}/${e.slug ?? e.id}`)
    }
    expect(missing).toEqual([])
  })
})

describe('[4.4-3] one team record per person', () => {
  it('no two English team records share a name', () => {
    const names = (content.team_members ?? []).filter((e) => !e.locale).map((e) => String(e.data.name).trim().toLowerCase())
    expect(names.filter((n, i) => names.indexOf(n) !== i)).toEqual([])
  })
})

// --- Content adapter on target-model items (4.5-3..8) -------------------------

type Entry = { id: string; slug?: string; data: Record<string, unknown> }
let db: Record<string, Entry[]> = {}

vi.mock('emdash', () => ({
  getEmDashCollection: async (collection: string, filter: { locale?: string } = {}) => ({
    entries: (filter.locale ?? 'en') === 'en' ? (db[collection] ?? []) : [],
  }),
  getEmDashEntry: async () => ({ entry: undefined }),
  getMenu: async () => undefined,
}))

const contentApi = (await import('../../src/lib/content/index')) as unknown as Record<string, (...args: any[]) => Promise<any>>

const img = (src: string) => ({ src, alt: '' })

beforeEach(() => {
  db = {
    partners: [
      { id: 'p1', slug: 'acme', data: { name: 'Acme', logo: img('/acme.png'), active: true, partner_type: 'corporate_sponsor', display_order: 1 } },
      { id: 'p2', slug: 'globex', data: { name: 'Globex', logo: img('/globex.png'), active: true, partner_type: 'corporate_sponsor', display_order: 2 } },
    ],
    event_offers: [
      { id: 'o1', data: { name: 'Gold', kind: 'package', sort_order: 2 } },
      { id: 'o2', data: { name: 'Diamond', kind: 'package', sort_order: 1 } },
    ],
    benefit_rows: [
      {
        id: 'b1',
        data: { name: 'Logo on banner', section: 'event', sort_order: 1, values: { o1: { check: true }, o2: { text: 'Large' } } },
      },
    ],
    events: [
      {
        id: 'e1',
        slug: 'golf-2026',
        data: {
          name: 'Golf 2026',
          lifecycle: 'upcoming',
          registration: 'open',
          event_type: 'fundraiser',
          start: '2099-11-09T13:00:00Z',
          summary: 'Golf day.',
          description: [],
          hero_photo: img('/hero.jpg'),
          venue_address: '1 Club Rd',
          // Editor's order: Globex before Acme.
          sponsors: ['p2', 'p1'],
          offers: ['o1', 'o2'],
          benefit_rows: ['b1'],
        },
      },
    ],
    children: [
      { id: 'c1', slug: 'ana-b', data: { name: 'Ana B.', age: 9, photo: img('/a.jpg'), sponsorship_status: 'available' } },
      { id: 'c2', slug: 'luis-c', data: { name: 'Luis C.', age: 7, photo: img('/l.jpg'), sponsorship_status: 'sponsored' } },
    ],
    team_members: [
      { id: 't1', slug: 'maria-p', data: { name: 'Maria P.', groups: ['board', 'staff'], photo: img('/m.jpg'), display_order: 1 } },
    ],
    articles: [
      {
        id: 'a1',
        slug: 'story',
        data: { title: 'A story', publish_date: '2026-01-01', category: 'cat-stories', featured_image: img('/f.jpg'), excerpt: 'Short excerpt.' },
      },
    ],
    categories: [{ id: 'cat-stories', slug: 'stories', data: { name: 'Stories', display_order: 1 } }],
  }
})

describe('[4.5-3] ordered references keep the editor order', () => {
  it("an event's sponsors follow the picked order", async () => {
    const event = await contentApi.getEventBySlug('golf-2026')
    expect(event?.sponsors?.map((s: { name: string }) => s.name)).toEqual(['Globex', 'Acme'])
  })
})

describe('[4.5-4] only available children are listed', () => {
  it('the child list leaves out sponsored children; their profile still resolves', async () => {
    const list = await contentApi.getChildren()
    expect(list.map((c: { slug: string }) => c.slug)).toEqual(['ana-b'])
    expect(await contentApi.getChildBySlug('luis-c')).toBeTruthy()
  })
})

describe('[4.5-5] one person in two groups', () => {
  it('appears under board and staff with the same slug', async () => {
    const board = await contentApi.getTeamMembers('board')
    const staff = await contentApi.getTeamMembers('staff')
    expect(board.map((m: { slug: string }) => m.slug)).toContain('maria-p')
    expect(staff.map((m: { slug: string }) => m.slug)).toContain('maria-p')
  })
})

describe('[4.5-6] benefit grid', () => {
  it('has one column per package offer in sort order, with cell values', async () => {
    const event = await contentApi.getEventBySlug('golf-2026')
    const grid = event?.benefitGrid
    expect(grid?.columns).toEqual(['Diamond', 'Gold'])
    expect(grid?.rows?.[0]?.cells).toEqual([{ text: 'Large' }, { check: true }])
  })
})

describe('[4.5-7] article SEO fallbacks', () => {
  it('uses title, excerpt and featured image when the SEO fields are empty', async () => {
    const article = await contentApi.getArticle('story')
    expect(article?.seo).toMatchObject({ title: 'A story', description: 'Short excerpt.', imageUrl: '/f.jpg' })
  })
})

describe('[4.5-8] event share image fallback', () => {
  it('uses the hero photo when share_image is empty', async () => {
    const event = await contentApi.getEventBySlug('golf-2026')
    expect(event?.seo?.imageUrl).toBe('/hero.jpg')
  })
})
