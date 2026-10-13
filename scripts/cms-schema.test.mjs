import { describe, expect, it } from 'vitest'
import { applyCmsSchema } from './cms-schema.mjs'
import { COPY_PAGES, FOLDERS } from '../src/lib/cmsNavigation.mjs'
import { COPY_FIELDS } from '../src/lib/copyCollections.mjs'

// In-memory EmDash schema API: collections (with fields) keyed by slug.
function fakeApi(collections) {
  const state = new Map(collections.map((c) => [c.slug, structuredClone({ fields: [], ...c })]))
  const calls = []
  const api = async (method, path, body) => {
    calls.push(`${method} ${path.replace(/\?.*/, '')}`)
    let m
    if (method === 'GET' && path === '/schema/collections') return { items: [...state.values()].map(({ fields, ...c }) => c) }
    if (method === 'GET' && (m = path.match(/^\/schema\/collections\/(\w+)\?includeFields=true$/))) return { item: state.get(m[1]) }
    if (method === 'POST' && path === '/schema/collections') {
      state.set(body.slug, { ...body, fields: [] })
      return {}
    }
    if (method === 'POST' && (m = path.match(/^\/schema\/collections\/(\w+)\/fields$/))) {
      state.get(m[1]).fields.push(body)
      return {}
    }
    if (method === 'PUT' && (m = path.match(/^\/schema\/collections\/(\w+)$/))) {
      Object.assign(state.get(m[1]), body)
      return {}
    }
    if (method === 'PUT' && (m = path.match(/^\/schema\/collections\/(\w+)\/fields\/(\w+)$/))) {
      Object.assign(state.get(m[1]).fields.find((f) => f.slug === m[2]), body)
      return {}
    }
    throw new Error(`unexpected ${method} ${path}`)
  }
  return { api, state, calls }
}

const existingSite = () => [
  { slug: 'events', label: 'Events' },
  { slug: 'posts', label: 'Blog posts' },
  { slug: 'resources', label: 'Resources' },
  { slug: 'faqs', label: 'FAQs' },
  { slug: 'testimonials', label: 'Testimonials' },
  { slug: 'team_members', label: 'Team members' },
  { slug: 'sponsors', label: 'Sponsors / partners' },
  { slug: 'sponsorship_packages', label: 'Sponsorship packages' },
  { slug: 'auction_items', label: 'Silent auction items' },
  { slug: 'campaign_updates', label: 'Campaign updates' },
  { slug: 'children', label: 'Sponsored children' },
  {
    slug: 'campaign_settings',
    label: 'Earthquake relief campaign settings',
    fields: [
      { slug: 'active', label: 'Campaign is active', validation: null },
      { slug: 'banner_text', label: 'Banner text', validation: { maxLength: 200 } },
    ],
  },
  { slug: 'pages', label: 'Static pages' },
  { slug: 'page_copy', label: 'Page copy' },
]

describe('applyCmsSchema', () => {
  it('creates every copy collection with its fields, and organizes the rest', async () => {
    const { api, state } = fakeApi(existingSite())
    const result = await applyCmsSchema({ api })

    expect(result.collectionsCreated).toHaveLength(COPY_PAGES.length)
    expect(result.missing).toEqual([])
    const home = state.get('copy_home')
    expect(home).toMatchObject({ label: 'Home', group: FOLDERS.pages, titleField: 'title', admin: { listColumns: [] }, supports: ['drafts', 'revisions'] })
    expect(home.fields.find((f) => f.slug === 'value').searchable).toBe(true)
    expect(home.fields.map((f) => f.slug)).toEqual(COPY_FIELDS.map((f) => f.slug))
    expect(state.get('events')).toMatchObject({ group: FOLDERS.collections, hidden: false })
    expect(state.get('pages')).toMatchObject({ hidden: true })
    expect(state.get('campaign_settings')).toMatchObject({ label: 'Site banner', group: FOLDERS.banner })
    expect(state.get('campaign_settings').fields.map((f) => f.label)).toEqual(['Show the banner', 'Banner text (shown at the top of every page)'])
    expect(state.get('campaign_settings').fields[1].validation).toEqual({ maxLength: 200 })
  })

  it('touches only the schema API: never menus, settings or content', async () => {
    const { api, calls } = fakeApi(existingSite())
    await applyCmsSchema({ api })
    expect(calls.filter((c) => !c.split(' ')[1].startsWith('/schema/collections'))).toEqual([])
    expect(calls.some((c) => c.startsWith('DELETE'))).toBe(false)
  })

  it('changes nothing on a second run', async () => {
    const { api, calls } = fakeApi(existingSite())
    await applyCmsSchema({ api })
    calls.length = 0
    const again = await applyCmsSchema({ api })
    expect(again).toEqual({ collectionsCreated: [], collectionsUpdated: [], fieldsCreated: [], fieldsUpdated: [], missing: [] })
    expect(calls.filter((c) => !c.startsWith('GET'))).toEqual([])
  })

  it('adds a missing field to an existing copy collection without touching the others', async () => {
    const { api, state } = fakeApi(existingSite())
    await applyCmsSchema({ api })
    state.get('copy_home').fields = state.get('copy_home').fields.filter((f) => f.slug !== 'position')
    const result = await applyCmsSchema({ api })
    expect(result.fieldsCreated).toEqual(['copy_home.position'])
  })

  it('upgrades a copy collection created before value was searchable and the text column was dropped', async () => {
    const { api, state } = fakeApi(existingSite())
    await applyCmsSchema({ api })
    const home = state.get('copy_home')
    home.admin = { listColumns: ['value'] }
    Object.assign(home.fields.find((f) => f.slug === 'value'), { searchable: false })
    const result = await applyCmsSchema({ api })
    expect(result.fieldsUpdated).toEqual(['copy_home.value'])
    expect(result.collectionsUpdated).toEqual(['copy_home'])
    expect(home.admin.listColumns).toEqual([])
    expect(home.fields.find((f) => f.slug === 'value').searchable).toBe(true)
  })

  it('writes nothing in a dry run, but reports what it would do', async () => {
    const { api, calls } = fakeApi(existingSite())
    const result = await applyCmsSchema({ api, dryRun: true })
    expect(result.collectionsCreated).toHaveLength(COPY_PAGES.length)
    expect(calls.filter((c) => !c.startsWith('GET'))).toEqual([])
  })

  it('reports configured collections the CMS lacks instead of creating them', async () => {
    const { api } = fakeApi(existingSite().filter((c) => c.slug !== 'testimonials'))
    expect((await applyCmsSchema({ api })).missing).toEqual(['testimonials'])
  })
})
