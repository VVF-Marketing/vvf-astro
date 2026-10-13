import { describe, expect, it } from 'vitest'
import {
  checkOperation,
  filterChildData,
  isRestricted,
  isSafeguardingUser,
  menuItemsProblem,
  normalizeApiPath,
  restOperation,
  slotEditProblem,
  type GuardContext,
} from './marketingGuard'

const slot = { key: 'hero.heading', label: 'Hero heading', format: 'plain', max_length: 20 }
const items: Record<string, { status: string; data: Record<string, unknown> }> = {
  'page_copy/s1': { status: 'published', data: slot },
  'page_copy/rich': { status: 'published', data: { key: 'body', label: 'Policy text', format: 'rich' } },
  'children/pub': { status: 'published', data: { published: true } },
  'children/pub-numeric': { status: 'published', data: { published: 1 } },
  'children/hidden': { status: 'published', data: { published: false } },
  'children/draft': { status: 'draft', data: { published: true } },
}

function ctx(overrides: Partial<GuardContext> = {}): GuardContext {
  return {
    safeguarding: false,
    lookup: async (collection, id) => items[`${collection}/${id}`],
    revisionCollection: async (id) => (id === 'rev-child' ? 'children' : 'faqs'),
    routeExists: (path) => ['/', '/ways-to-give', '/events', '/events/[slug]'].some((r) => r === path || (r.includes('[') && path.startsWith('/events/'))),
    ...overrides,
  }
}

const check = (tool: string, args: Record<string, unknown>, c = ctx()) => checkOperation({ tool, args }, c)

describe('who is restricted', () => {
  it('restricts every role below admin and reads the allowlist case-insensitively', () => {
    expect(isRestricted({ id: '1', email: 'm@x.org', role: 40 })).toBe(true)
    expect(isRestricted({ id: '1', email: 'a@x.org', role: 50 })).toBe(false)
    expect(isRestricted(undefined)).toBe(false)
    expect(isSafeguardingUser({ id: '1', email: 'Safe@X.org', role: 40 }, ' safe@x.org, other@x.org')).toBe(true)
    expect(isSafeguardingUser({ id: '1', email: 'm@x.org', role: 40 }, 'safe@x.org')).toBe(false)
    expect(isSafeguardingUser({ id: '1', email: 'm@x.org', role: 40 }, undefined)).toBe(false)
  })
})

describe('deny by default', () => {
  it.each(['schema_create_collection', 'schema_delete_field', 'settings_update', 'content_permanent_delete', 'menu_delete', 'some_new_tool'])(
    'refuses %s',
    async (tool) => {
      expect((await check(tool, { collection: 'faqs', id: 'x' })).allow).toBe(false)
    }
  )

  it('allows ordinary content edits', async () => {
    expect(await check('content_update', { collection: 'events', id: 'e1', data: { title: 'x' } })).toEqual({ allow: true })
    expect(await check('content_publish', { collection: 'faqs', id: 'f1' })).toEqual({ allow: true })
  })
})

describe('child profiles', () => {
  it.each(['content_create', 'content_update', 'content_publish', 'content_unpublish', 'content_delete', 'content_duplicate'])(
    'blocks %s for non-safeguarding users',
    async (tool) => {
      const d = await check(tool, { collection: 'children', id: 'pub', translationOf: 'pub' })
      expect(d).toMatchObject({ allow: false, message: expect.stringContaining('safeguarding') })
    }
  )

  it('lets the safeguarding team edit', async () => {
    expect(await check('content_update', { collection: 'children', id: 'pub', data: {} }, ctx({ safeguarding: true }))).toEqual({ allow: true })
  })

  it('hides unpublished or draft profiles by id', async () => {
    expect((await check('content_get', { collection: 'children', id: 'pub' })).allow).toBe(true)
    expect((await check('content_get', { collection: 'children', id: 'pub-numeric' })).allow).toBe(true)
    expect(await check('content_get', { collection: 'children', id: 'hidden' })).toMatchObject({ allow: false, status: 404 })
    expect(await check('content_get', { collection: 'children', id: 'draft' })).toMatchObject({ allow: false, status: 404 })
  })

  it('blocks child history and restoring a child revision', async () => {
    expect((await check('revision_list', { collection: 'children', id: 'pub' })).allow).toBe(false)
    expect((await check('revision_restore', { revisionId: 'rev-child' })).allow).toBe(false)
    expect((await check('revision_restore', { revisionId: 'rev-faq' })).allow).toBe(true)
  })

  it('refuses a revision whose collection it cannot confirm', async () => {
    const missing = ctx({ revisionCollection: async () => undefined })
    const failing = ctx({ revisionCollection: async () => Promise.reject(new Error('database unavailable')) })
    for (const c of [missing, failing]) {
      expect(await check('revision_restore', { revisionId: 'rev-x' }, c)).toMatchObject({ allow: false, status: 404 })
      expect(await check('revision_get', { revisionId: 'rev-x' }, c)).toMatchObject({ allow: false, status: 404 })
    }
    expect((await check('revision_restore', { revisionId: 'rev-x' }, ctx({ safeguarding: true, revisionCollection: async () => undefined }))).allow).toBe(true)
  })

  it('filters lists: drops unpublished profiles and strips the private name everywhere', () => {
    const body = {
      items: [
        { id: 'a', status: 'published', data: { display_name: 'A', published: true, private_full_name: 'Secret A' } },
        { id: 'b', status: 'published', data: { display_name: 'B', published: false } },
        { id: 'c', status: 'draft', data: { display_name: 'C', published: true } },
        { id: 'd', status: 'published', data: { display_name: 'D', published: 1 } },
      ],
    }
    expect(filterChildData(body, true)).toEqual({
      items: [
        { id: 'a', status: 'published', data: { display_name: 'A', published: true } },
        { id: 'd', status: 'published', data: { display_name: 'D', published: 1 } },
      ],
    })
    expect(filterChildData({ results: [{ collection: 'children', title: 'A' }, { collection: 'faqs', title: 'Q' }] })).toEqual({
      results: [{ collection: 'faqs', title: 'Q' }],
    })
  })
})

describe('pages and copy slots', () => {
  it('keeps the pages inventory read-only', async () => {
    expect((await check('content_update', { collection: 'pages', id: 'p', data: {} })).allow).toBe(false)
    expect((await check('content_get', { collection: 'pages', id: 'p' })).allow).toBe(true)
  })

  it('never creates or deletes slots by hand', async () => {
    expect((await check('content_create', { collection: 'page_copy', data: {} })).allow).toBe(false)
    expect((await check('content_delete', { collection: 'page_copy', id: 's1' })).allow).toBe(false)
  })

  it('accepts a value within limits and rejects metadata changes or over-long text', async () => {
    expect((await check('content_update', { collection: 'page_copy', id: 's1', data: { value: 'Short' } })).allow).toBe(true)
    expect(await check('content_update', { collection: 'page_copy', id: 's1', data: { value: 'x'.repeat(21) } })).toMatchObject({
      allow: false,
      message: expect.stringContaining('limited to 20 characters'),
    })
    expect(await check('content_update', { collection: 'page_copy', id: 's1', data: { value: 'ok', max_length: 500 } })).toMatchObject({
      allow: false,
      message: expect.stringContaining('max_length'),
    })
  })

  it('checks the value field matches the slot format', () => {
    expect(slotEditProblem(slot, { rich_value: [] })).toContain('Only the text')
    expect(slotEditProblem({ label: 'Body', format: 'rich' }, { rich_value: 'plain string' })).toContain('rich text')
    expect(slotEditProblem({ label: 'Img', format: 'image' }, { image_value: 'x' })).toContain('image')
  })

  it('rejects rich text the site cannot render', async () => {
    const value = [{ _type: 'block', _key: 'a', style: 'normal', markDefs: [{ _key: 'l', _type: 'link', href: 'javascript:alert(1)' }], children: [{ _type: 'span', text: 'x', marks: ['l', 'underline'] }] }]
    const d = await check('content_update', { collection: 'page_copy', id: 'rich', data: { rich_value: value } })
    expect(d).toMatchObject({ allow: false, message: expect.stringMatching(/javascript.*underline|underline.*javascript/) })
    const ok = [{ _type: 'block', _key: 'a', style: 'h2', markDefs: [], children: [{ _type: 'span', text: 'x', marks: ['strong'] }] }]
    expect((await check('content_update', { collection: 'page_copy', id: 'rich', data: { rich_value: ok } })).allow).toBe(true)
  })
})

describe('menus', () => {
  const routeExists = ctx().routeExists

  it('accepts links to real pages in the menu locale and external links', () => {
    expect(menuItemsProblem([{ label: 'Give', customUrl: '/ways-to-give' }, { label: 'X', customUrl: 'https://x.org' }], 'en', routeExists)).toBeUndefined()
    expect(menuItemsProblem([{ label: 'Dar', customUrl: '/es/ways-to-give', children: [{ label: 'Ev', customUrl: '/es/events/golf' }] }], 'es', routeExists)).toBeUndefined()
  })

  it('rejects broken links, wrong-locale links and CSS classes', () => {
    expect(menuItemsProblem([{ label: 'Nope', customUrl: '/es/pagina-que-no-existe' }], 'es', routeExists)).toContain('/es/pagina-que-no-existe')
    expect(menuItemsProblem([{ label: 'Give', customUrl: '/ways-to-give' }], 'es', routeExists)).toContain('Spanish')
    expect(menuItemsProblem([{ label: 'Give', customUrl: '/es/ways-to-give' }], 'en', routeExists)).toContain('English')
    expect(menuItemsProblem([{ label: 'Give', customUrl: '/ways-to-give', cssClasses: 'text-red-500' }], 'en', routeExists)).toContain('CSS')
  })

  it('applies to the menu_set_items tool', async () => {
    expect((await check('menu_set_items', { name: 'primary', locale: 'es', items: [{ label: 'x', customUrl: '/es/nope' }] })).allow).toBe(false)
  })
})

describe('translations', () => {
  it('only lets translations be created as drafts', async () => {
    expect(await check('content_create', { collection: 'events', translationOf: 'e1', status: 'published', data: {} })).toMatchObject({
      allow: false,
      message: expect.stringContaining('status "draft"'),
    })
    expect(await check('content_create', { collection: 'events', translationOf: 'e1', status: 'draft', data: {} })).toEqual({ allow: true })
    expect(await check('content_create', { collection: 'events', translationOf: 'e1', data: {} })).toEqual({ allow: true })
  })
})

describe('restOperation', () => {
  const q = new URLSearchParams()
  it.each([
    ['GET', '/_emdash/api/content/children', 'content_list'],
    ['GET', '/_emdash/api/content/children/abc', 'content_get'],
    ['POST', '/_emdash/api/content/faqs', 'content_create'],
    ['PUT', '/_emdash/api/content/faqs/abc', 'content_update'],
    ['DELETE', '/_emdash/api/content/faqs/abc', 'content_delete'],
    ['POST', '/_emdash/api/content/faqs/abc/publish', 'content_publish'],
    ['DELETE', '/_emdash/api/content/faqs/abc/permanent', 'content_permanent_delete'],
    ['GET', '/_emdash/api/content/faqs/abc/revisions', 'revision_list'],
    ['POST', '/_emdash/api/revisions/r1/restore', 'revision_restore'],
    ['POST', '/_emdash/api/menus/primary/items', 'menu_set_items'],
    ['PUT', '/_emdash/api/menus/primary/items/i1', 'menu_set_items'],
    ['DELETE', '/_emdash/api/menus/primary', 'menu_delete'],
  ])('%s %s → %s', (method, path, tool) => {
    expect(restOperation(method, path, {}, q)?.tool).toBe(tool)
  })

  it('leaves the pass-through areas to EmDash', () => {
    expect(restOperation('GET', '/_emdash/api/manifest', undefined, q)).toBeUndefined()
    expect(restOperation('POST', '/_emdash/api/media', {}, q)).toBeUndefined()
    expect(restOperation('GET', '/_emdash/api/admin/bylines', undefined, q)).toBeUndefined()
  })

  // Review finding (PR #16): a body could replace the URL's collection/id.
  it('never lets the body retarget an operation', async () => {
    const update = restOperation('PUT', '/_emdash/api/content/children/pub', { collection: 'events', id: 'e1', data: {} }, q)!
    expect(update.args).toMatchObject({ collection: 'children', id: 'pub' })
    expect((await checkOperation(update, ctx())).allow).toBe(false)
    const publish = restOperation('POST', '/_emdash/api/content/children/pub/publish', { collection: 'events' }, q)!
    expect((await checkOperation(publish, ctx())).allow).toBe(false)
    const create = restOperation('POST', '/_emdash/api/content/children', { collection: 'events', data: {} }, q)!
    expect(create.args.collection).toBe('children')
    const menu = restOperation('PUT', '/_emdash/api/menus/primary', { name: 'other' }, q)!
    expect(menu.args.name).toBe('primary')
  })

  // Review finding (PR #16): unmapped REST areas went straight to EmDash.
  it.each([
    ['GET', '/_emdash/api/relations/r1'],
    ['GET', '/_emdash/api/import'],
    ['POST', '/_emdash/api/plugins/x/run'],
    ['POST', '/_emdash/api/schema/collections'],
    ['GET', '/_emdash/api/something-new'],
  ])('refuses unmapped %s %s', async (method, path) => {
    const op = restOperation(method, path, {}, q)
    expect(op).toBeDefined()
    expect((await checkOperation(op!, ctx())).allow).toBe(false)
  })

  it('guards revision reads and filters search and the dashboard', async () => {
    const child = restOperation('GET', '/_emdash/api/revisions/rev-child', undefined, q)!
    expect(await checkOperation(child, ctx())).toMatchObject({ allow: false, status: 404 })
    expect(await checkOperation(child, ctx({ safeguarding: true }))).toEqual({ allow: true })
    const other = restOperation('GET', '/_emdash/api/revisions/rev-faq', undefined, q)!
    expect(await checkOperation(other, ctx())).toEqual({ allow: true })
    expect(restOperation('GET', '/_emdash/api/search', undefined, new URLSearchParams('q=a&status=draft'))?.tool).toBe('search')
    expect(restOperation('GET', '/_emdash/api/dashboard', undefined, q)?.tool).toBe('dashboard')
  })

  // Review finding (PR #16): `/mcp/` reached EmDash's MCP route unguarded.
  it('normalizes trailing and doubled slashes', () => {
    expect(normalizeApiPath('/_emdash/api/mcp/')).toBe('/_emdash/api/mcp')
    expect(normalizeApiPath('/_emdash//api/mcp//')).toBe('/_emdash/api/mcp')
    expect(restOperation('PUT', '/_emdash/api/content/children/pub/', {}, q)?.args).toMatchObject({ collection: 'children', id: 'pub' })
  })
})
