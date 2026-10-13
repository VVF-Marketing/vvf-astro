import { describe, expect, it } from 'vitest'
import { migrateCopyCollections } from './copy-collections.mjs'

// In-memory EmDash: content rows per collection, drafts as revisions.
// `exists`: collections the fake CMS has (others 404 when listed).
function fakeCms({ missing = [], exists = ['page_copy', 'copy_contact'] } = {}) {
  const rows = []
  const revisions = new Map()
  const calls = []
  let next = 1
  const find = (id) => rows.find((r) => r.id === id)
  const client = {
    async *listAll(collection, { locale }) {
      if (missing.includes(collection) || !exists.includes(collection)) throw Object.assign(new Error('not found'), { status: 404 })
      for (const r of rows.filter((r) => r.collection === collection && r.locale === locale)) yield structuredClone(r)
    },
    async create(collection, input) {
      const id = `n${next++}`
      const row = {
        id,
        collection,
        locale: input.locale,
        status: input.status,
        translationGroup: input.translationOf ? find(input.translationOf).translationGroup : id,
        draftRevisionId: null,
        liveRevisionId: null,
        data: structuredClone(input.data),
      }
      rows.push(row)
      calls.push(`create ${collection} ${input.locale}`)
      return structuredClone(row)
    },
    async update(collection, id, { data }) {
      const row = find(id)
      if (row.status === 'published') {
        const rev = `rev${next++}`
        revisions.set(rev, { ...row.data, ...data })
        row.draftRevisionId = rev
      } else Object.assign(row.data, data)
      calls.push(`update ${collection} ${id}`)
    },
    async publish(collection, id) {
      const row = find(id)
      if (row.draftRevisionId) Object.assign(row.data, revisions.get(row.draftRevisionId))
      row.status = 'published'
      row.draftRevisionId = null
      calls.push(`publish ${collection} ${id}`)
    },
  }
  const api = async (method, path, body) => {
    calls.push(`${method} ${path}`)
    const m = path.match(/^\/revisions\/(\w+)$/)
    if (m) return { item: { data: revisions.get(m[1]) } }
    if (method === 'PUT' && /^\/schema\/collections\/\w+$/.test(path)) return { hidden: body.hidden }
    throw new Error(`unexpected ${method} ${path}`)
  }
  const seedOld = (route, key, locale, data, extra = {}) => {
    const id = `old${next++}`
    const en = rows.find((r) => r.collection === 'page_copy' && r.locale === 'en' && r.data.key === key && r.data.route_path === route)
    rows.push({ id, collection: 'page_copy', locale, status: 'published', translationGroup: en?.translationGroup ?? id, draftRevisionId: null, liveRevisionId: 'live', data: { route_path: route, key, ...data }, ...extra })
    return id
  }
  return { client, api, rows, revisions, calls, seedOld }
}

const manifests = [
  {
    route: '/contact',
    slots: {
      'hero.heading': { label: 'Hero heading', default: 'Contact us' },
      'seo.title': { label: 'Title', default: 'Contact | VVF', maxLength: 60 },
    },
  },
]

function withOldCopy() {
  const cms = fakeCms()
  cms.seedOld('/contact', 'hero.heading', 'en', { value: 'Talk to us' })
  cms.seedOld('/contact', 'hero.heading', 'es', { value: 'Hablemos' })
  cms.seedOld('/contact', 'seo.title', 'en', { value: 'Contact | VVF' })
  cms.seedOld('/contact', 'seo.title', 'es', {})
  return cms
}

describe('migrateCopyCollections', () => {
  it("moves published values into the page's collection, with Spanish linked as translations", async () => {
    const cms = withOldCopy()
    const result = await migrateCopyCollections({ ...cms, manifests })

    const moved = cms.rows.filter((r) => r.collection === 'copy_contact')
    const en = moved.find((r) => r.locale === 'en' && r.data.key === 'hero.heading')
    const es = moved.find((r) => r.locale === 'es' && r.data.key === 'hero.heading')
    expect(result).toMatchObject({ copied: 4, conflicts: [], hidden: true })
    expect(en).toMatchObject({ status: 'published', data: { value: 'Talk to us', title: '02 · Content · Hero heading', section: 'content', position: 2 } })
    expect(es).toMatchObject({ status: 'published', data: { value: 'Hablemos' } })
    expect(es.translationGroup).toBe(en.translationGroup)
    expect(moved.find((r) => r.locale === 'es' && r.data.key === 'seo.title').data.value).toBeUndefined()
    expect(cms.calls).toContain('PUT /schema/collections/page_copy')
  })

  it('carries an open draft over as a draft, without publishing it', async () => {
    const cms = withOldCopy()
    const old = cms.rows.find((r) => r.collection === 'page_copy' && r.locale === 'en' && r.data.key === 'hero.heading')
    old.draftRevisionId = 'd1'
    cms.revisions.set('d1', { ...old.data, value: 'Draft heading' })

    const result = await migrateCopyCollections({ ...cms, manifests })
    const en = cms.rows.find((r) => r.collection === 'copy_contact' && r.locale === 'en' && r.data.key === 'hero.heading')
    expect(result.draftsCopied).toBe(1)
    expect(en.data.value).toBe('Talk to us')
    expect(cms.revisions.get(en.draftRevisionId).value).toBe('Draft heading')
  })

  it('changes nothing when run again', async () => {
    const cms = withOldCopy()
    await migrateCopyCollections({ ...cms, manifests })
    cms.calls.length = 0
    const again = await migrateCopyCollections({ ...cms, manifests })
    expect(again).toMatchObject({ copied: 0, replacedDefaults: 0, draftsCopied: 0, conflicts: [] })
    expect(cms.calls.filter((c) => /^(create|update|publish)/.test(c))).toEqual([])
  })

  it('replaces rows the sync filled with defaults, but keeps edits made in the new collection', async () => {
    const cms = withOldCopy()
    const synced = await cms.client.create('copy_contact', { status: 'draft', locale: 'en', data: { key: 'hero.heading', value: 'Contact us' } })
    await cms.client.publish('copy_contact', synced.id)
    const edited = await cms.client.create('copy_contact', { status: 'draft', locale: 'en', data: { key: 'seo.title', value: 'Edited after the move' } })
    await cms.client.publish('copy_contact', edited.id)

    const result = await migrateCopyCollections({ ...cms, manifests })
    expect(result.replacedDefaults).toBe(1)
    expect(result.conflicts).toEqual(['/contact#seo.title (en)'])
    expect(cms.rows.find((r) => r.id === synced.id).data.value).toBe('Talk to us')
    expect(cms.rows.find((r) => r.id === edited.id).data.value).toBe('Edited after the move')
  })

  it('treats values that differ only in key order as the same', async () => {
    const cms = fakeCms()
    cms.seedOld('/contact', 'seo.title', 'en', { image_value: { provider: 'external', id: '', src: '/og.jpg' } })
    const target = await cms.client.create('copy_contact', { status: 'draft', locale: 'en', data: { key: 'seo.title', image_value: { id: '', provider: 'external', src: '/og.jpg' } } })
    await cms.client.publish('copy_contact', target.id)
    const result = await migrateCopyCollections({ ...cms, manifests: [{ route: '/contact', slots: { 'seo.title': manifests[0].slots['seo.title'] } }] })
    expect(result).toMatchObject({ conflicts: [], alreadyThere: 1 })
  })

  it('moves rows out of a legacy collection, keeping translations, then hides it', async () => {
    const legacy = [{ collection: 'copy_old_contact', route: '/contact' }]
    const cms = fakeCms({ exists: ['copy_old_contact', 'copy_contact'] })
    const en = await cms.client.create('copy_old_contact', { status: 'draft', locale: 'en', data: { key: 'hero.heading', value: 'Old heading' } })
    await cms.client.publish('copy_old_contact', en.id)
    const es = await cms.client.create('copy_old_contact', { status: 'draft', locale: 'es', translationOf: en.id, data: { key: 'hero.heading', value: 'Encabezado' } })
    await cms.client.publish('copy_old_contact', es.id)

    const result = await migrateCopyCollections({ ...cms, manifests, legacy })
    const moved = cms.rows.filter((r) => r.collection === 'copy_contact' && r.data.key === 'hero.heading')
    expect(moved.find((r) => r.locale === 'en').data.value).toBe('Old heading')
    expect(moved.find((r) => r.locale === 'es').data.value).toBe('Encabezado')
    expect(moved[0].translationGroup).toBe(moved[1].translationGroup)
    expect(result).toMatchObject({ legacyHidden: ['copy_old_contact'], hidden: false })
    expect(cms.calls).toContain('PUT /schema/collections/copy_old_contact')
  })

  it('treats an image EmDash re-stored with provider and empty id as the same image', async () => {
    const legacy = [{ collection: 'copy_old_contact', route: '/contact' }]
    const cms = fakeCms({ exists: ['copy_old_contact', 'copy_contact'] })
    const old = await cms.client.create('copy_old_contact', { status: 'draft', locale: 'en', data: { key: 'seo.title', image_value: { src: '/og.jpg' } } })
    await cms.client.publish('copy_old_contact', old.id)
    const moved = await cms.client.create('copy_contact', { status: 'draft', locale: 'en', data: { key: 'seo.title', image_value: { provider: 'external', id: '', src: '/og.jpg' } } })
    await cms.client.publish('copy_contact', moved.id)
    const result = await migrateCopyCollections({ ...cms, manifests: [{ route: '/contact', slots: { 'seo.title': manifests[0].slots['seo.title'] } }], legacy })
    expect(result).toMatchObject({ conflicts: [], alreadyThere: 1 })
  })

  it('works on a database with neither page_copy nor legacy collections', async () => {
    const cms = fakeCms({ exists: ['copy_contact'] })
    const result = await migrateCopyCollections({ ...cms, manifests })
    expect(result).toMatchObject({ hidden: false, legacyHidden: [], conflicts: [] })
    expect(cms.calls.filter((c) => c.startsWith('PUT'))).toEqual([])
  })

  it('stops short of hiding page_copy when a copy collection is missing', async () => {
    const cms = fakeCms({ missing: ['copy_contact'] })
    const result = await migrateCopyCollections({ ...cms, manifests })
    expect(result).toMatchObject({ missingCollections: ['copy_contact'], hidden: false })
    expect(cms.calls).not.toContain('PUT /schema/collections/page_copy')
  })

  it('writes nothing in a dry run', async () => {
    const cms = withOldCopy()
    const result = await migrateCopyCollections({ ...cms, manifests, dryRun: true })
    expect(result.copied).toBe(4)
    expect(cms.calls.filter((c) => /^(create|update|publish|PUT)/.test(c))).toEqual([])
  })
})
