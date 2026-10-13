// Write guard for non-admin CMS users (the marketing team), applied to the
// EmDash MCP endpoint and the admin REST API by src/middleware.ts. EmDash's
// own roles and token scopes still apply; this adds the rules they can't
// express (openspec/changes/marketing-editing-and-localization, design D7):
//
//  1. Child profiles: only safeguarding-allowlisted users may change them; for
//     everyone else only published profiles are readable, without the
//     private full name.
//  2. Copy slots: only the value (in the slot's format, within its maximum
//     length, rich text limited to supported formatting) may change; slots are
//     never created or deleted by hand.
//  3. The `pages` inventory is read-only.
//  4. Menu links must resolve to a page in the menu's locale (or be external),
//     and menu items can't carry CSS classes.
//  5. Translations can only be created as drafts (a person publishes them).
//     Refused rather than rewritten: Astro passes the endpoint the original
//     request body even after middleware forwards a modified one.
//  6. Anything the guard doesn't know is refused (deny by default): unknown
//     MCP tools, and REST areas that are neither mapped onto a tool nor in
//     PASS_THROUGH (see restOperation).
//
// Operations are normalized to MCP tool names; REST requests are mapped onto
// the same names (restOperation) so one policy covers both.
import { SAFE_HREF, richViolations } from './copy'

export const ROLE_ADMIN = 50

export interface Operation {
  tool: string
  args: Record<string, any>
}

export interface GuardUser {
  id: string
  email: string
  role: number
}

export interface GuardContext {
  safeguarding: boolean
  // The item an operation targets (data plus status), or undefined.
  lookup: (collection: string, id: string, locale?: string) => Promise<{ status?: string; data: Record<string, any> } | undefined>
  revisionCollection: (revisionId: string) => Promise<string | undefined>
  // Whether a site path (without /es) is a page of the site.
  routeExists: (path: string) => boolean
}

export type Decision = { allow: true } | { allow: false; message: string; status?: number }

export function isRestricted(user: GuardUser | undefined): boolean {
  return Boolean(user) && user!.role < ROLE_ADMIN
}

export function isSafeguardingUser(user: GuardUser, allowlist: string | undefined): boolean {
  const emails = (allowlist ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  return emails.includes(user.email.toLowerCase())
}

const READ_TOOLS = new Set([
  'content_list',
  'content_get',
  'content_compare',
  'content_list_trashed',
  'content_translations',
  'revision_list',
  'revision_get',
  'search',
  'dashboard',
  'media_list',
  'media_get',
  'menu_list',
  'menu_get',
  'menu_translations',
  'schema_list_collections',
  'schema_get_collection',
  'taxonomy_list',
  'taxonomy_get',
  'taxonomy_list_terms',
  'byline_list',
  'byline_get',
])
const CONTENT_WRITE_TOOLS = new Set([
  'content_create',
  'content_update',
  'content_delete',
  'content_restore',
  'content_publish',
  'content_unpublish',
  'content_schedule',
  'content_unschedule',
  'content_discard_draft',
  'content_duplicate',
])
const OTHER_WRITE_TOOLS = new Set(['media_create', 'media_upload', 'media_update', 'revision_restore', 'menu_update', 'menu_set_items'])

const CHILDREN = 'children'
const VALUE_FIELD = { plain: 'value', rich: 'rich_value', image: 'image_value' } as const
const deny = (message: string, status = 403): Decision => ({ allow: false, message, status })

const CHILD_LOCK =
  'Child profiles require safeguarding sign-off: only the safeguarding team can create, change, publish, translate or delete them.'

export async function checkOperation(op: Operation, ctx: GuardContext): Promise<Decision> {
  const { tool, args } = op
  if (!READ_TOOLS.has(tool) && !CONTENT_WRITE_TOOLS.has(tool) && !OTHER_WRITE_TOOLS.has(tool)) {
    return deny(`"${tool}" isn't available to your role. Ask a site administrator.`)
  }
  const collection: string | undefined = args.collection

  // 1. Children
  if (collection === CHILDREN && !ctx.safeguarding) {
    if (CONTENT_WRITE_TOOLS.has(tool)) return deny(CHILD_LOCK)
    if (tool === 'revision_list' || tool === 'content_compare' || tool === 'content_translations' || tool === 'content_list_trashed') {
      return deny('Child profile history and drafts are only available to the safeguarding team.')
    }
    if (tool === 'content_get') {
      const item = await ctx.lookup(CHILDREN, String(args.id), args.locale)
      if (!item || !isVisibleChild(item)) return deny('Not found', 404)
    }
    // content_list / search results are filtered by filterChildData.
  }
  if ((tool === 'revision_restore' || tool === 'revision_get') && !ctx.safeguarding) {
    // A revision whose collection can't be read (missing, or the lookup
    // failed) is treated as a child's: refuse rather than let it through.
    const revisionCollection = await ctx.revisionCollection(String(args.revisionId)).catch(() => undefined)
    if (!revisionCollection) return deny('Not found', 404)
    if (revisionCollection === CHILDREN) {
      return tool === 'revision_get' ? deny('Not found', 404) : deny(CHILD_LOCK)
    }
  }

  // 3. pages inventory
  if (collection === 'pages' && CONTENT_WRITE_TOOLS.has(tool)) {
    return deny('The page list is maintained automatically and can’t be edited.')
  }

  // 2. copy slots
  if (collection === 'page_copy') {
    if (tool === 'content_create' || tool === 'content_delete' || tool === 'content_duplicate') {
      return deny('Copy slots are defined by the site’s code; edit an existing slot’s text instead.')
    }
    if (tool === 'content_update') {
      const slot = await ctx.lookup('page_copy', String(args.id), args.locale)
      if (!slot) return deny('Copy slot not found', 404)
      const problem = slotEditProblem(slot.data, args.data ?? {})
      if (problem) return deny(problem)
    }
  }

  // 4. menus
  if (tool === 'menu_set_items') {
    const problem = menuItemsProblem(args.items ?? [], args.locale ?? 'en', ctx.routeExists)
    if (problem) return deny(problem)
  }

  // 5. translations are drafts
  if (tool === 'content_create' && args.translationOf && args.status && args.status !== 'draft') {
    return deny('Translations are created as drafts so a person can review them before they go live: create it with status "draft", then publish it after review.')
  }
  return { allow: true }
}

// Why an edit to a copy slot isn't allowed, or undefined.
export function slotEditProblem(slot: Record<string, any>, data: Record<string, any>): string | undefined {
  const format = (slot.format ?? 'plain') as keyof typeof VALUE_FIELD
  const field = VALUE_FIELD[format]
  const label = slot.label ?? slot.key
  const others = Object.keys(data).filter((k) => k !== field)
  if (others.length) {
    return `Only the text of "${label}" can be changed (field "${field}"); not: ${others.join(', ')}.`
  }
  const value = data[field]
  if (value == null) return undefined
  if (format === 'plain') {
    if (typeof value !== 'string') return `"${label}" takes plain text.`
    const max = slot.max_length
    if (typeof max === 'number' && value.length > max) {
      return `"${label}" is limited to ${max} characters (this text has ${value.length}).`
    }
  }
  if (format === 'rich') {
    if (!Array.isArray(value)) return `"${label}" takes rich text (Portable Text blocks).`
    const issues = richViolations(value)
    if (issues.length) return `"${label}" uses formatting the site doesn't support: ${issues.join('; ')}.`
  }
  if (format === 'image' && (typeof value !== 'object' || Array.isArray(value))) return `"${label}" takes an image.`
  return undefined
}

const EXTERNAL = /^(https?:\/\/|mailto:|tel:|#)/i

// Why a menu's items aren't allowed, or undefined.
export function menuItemsProblem(items: Record<string, any>[], locale: string, routeExists: (path: string) => boolean): string | undefined {
  for (const item of flatten(items)) {
    if (item.cssClasses) return `Menu item "${item.label}" can't set CSS classes (styling is part of the site's design).`
    const url: string | undefined = item.customUrl ?? item.url
    if (!url || EXTERNAL.test(url)) continue
    const isSpanish = /^\/es(\/|$)/.test(url)
    if (locale === 'es' ? !isSpanish : isSpanish) {
      return `Menu item "${item.label}" links to ${url}, which isn't a ${locale === 'es' ? 'Spanish (/es)' : 'English'} page.`
    }
    const path = (url.replace(/^\/es(?=\/|$)/, '') || '/').split(/[?#]/)[0].replace(/\/$/, '') || '/'
    if (!SAFE_HREF.test(url) || !routeExists(path)) return `Menu item "${item.label}" links to ${url}, which isn't a page on the site.`
  }
  return undefined
}

function flatten(items: Record<string, any>[]): Record<string, any>[] {
  return items.flatMap((i) => [i, ...flatten(i.children ?? [])])
}

// API areas a restricted user may reach without a mapped operation. EmDash's
// own permissions still apply, and none of them returns content items.
export const PASS_THROUGH = new Set([
  'auth',
  'oauth',
  'manifest',
  'media',
  'taxonomies',
  'settings',
  'sections',
  'widget-areas',
  'widget-components',
  'redirects',
  'themes',
  'admin',
])

// One spelling per route: Astro serves `/x/`, `/x` and `//x` alike, so the
// guard compares paths without empty segments or a trailing slash.
export function normalizeApiPath(pathname: string): string {
  return pathname.replace(/\/{2,}/g, '/').replace(/(.)\/$/, '$1')
}

// Maps an admin REST request onto the equivalent MCP operation; undefined for
// the PASS_THROUGH areas, and an unknown tool (refused) for anything else.
// Values from the URL always win over the request body, so a body can't
// retarget an operation at another collection or item.
export function restOperation(method: string, pathname: string, body: Record<string, any> | undefined, search: URLSearchParams): Operation | undefined {
  const parts = normalizeApiPath(pathname).replace(/^\/_emdash\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  const locale = search.get('locale') ?? undefined
  if (parts[0] === 'content' && parts[1]) {
    const [, collection, id, action] = parts
    const target = { ...body, collection, id, locale: locale ?? body?.locale }
    if (id === 'trash') return { tool: 'content_list_trashed', args: { collection } }
    if (!id) return method === 'GET' ? { tool: 'content_list', args: { collection, locale } } : { tool: 'content_create', args: { ...body, collection } }
    if (!action) {
      if (method === 'GET') return { tool: 'content_get', args: { collection, id, locale } }
      if (method === 'PUT' || method === 'PATCH') return { tool: 'content_update', args: target }
      if (method === 'DELETE') return { tool: 'content_delete', args: { collection, id } }
    }
    const actions: Record<string, string> = {
      publish: 'content_publish',
      unpublish: 'content_unpublish',
      schedule: method === 'DELETE' ? 'content_unschedule' : 'content_schedule',
      restore: 'content_restore',
      duplicate: 'content_duplicate',
      'discard-draft': 'content_discard_draft',
      permanent: 'content_permanent_delete',
      translations: method === 'GET' ? 'content_translations' : 'content_create',
      revisions: 'revision_list',
      compare: 'content_compare',
      'preview-url': 'content_get',
      lock: 'content_get',
      terms: method === 'GET' ? 'content_get' : 'content_update',
      references: 'content_get',
    }
    const tool = action ? actions[action] : undefined
    return { tool: tool ?? `content_${action}`, args: target }
  }
  if (parts[0] === 'revisions' && parts[1]) {
    if (parts[2] === 'restore') return { tool: 'revision_restore', args: { revisionId: parts[1] } }
    if (!parts[2] && method === 'GET') return { tool: 'revision_get', args: { revisionId: parts[1] } }
  }
  if (parts[0] === 'search' && method === 'GET') return { tool: 'search', args: {} }
  if (parts[0] === 'dashboard' && method === 'GET') return { tool: 'dashboard', args: {} }
  if (parts[0] === 'menus') {
    if (method === 'GET') return { tool: 'menu_get', args: { name: parts[1] } }
    const [, name, sub] = parts
    const menuLocale = locale ?? body?.locale ?? 'en'
    if (sub === 'items' || sub === 'reorder') return { tool: 'menu_set_items', args: { name, locale: menuLocale, items: body ? [body] : [] } }
    if (!name || sub === 'translations') return { tool: method === 'POST' ? 'menu_create' : 'menu_delete', args: { name } }
    return { tool: method === 'DELETE' ? 'menu_delete' : 'menu_update', args: { ...body, name, locale: menuLocale } }
  }
  if (parts[0] && PASS_THROUGH.has(parts[0])) return undefined
  return { tool: `rest_${parts.slice(0, 2).join('_') || 'root'}`, args: {} }
}

// Child data as a non-safeguarding user may see it: published profiles only,
// never the private full name. Works on any JSON value (REST bodies, MCP tool
// results) by finding child items within it.
export function filterChildData(value: unknown, inChildren = false): unknown {
  if (Array.isArray(value)) {
    return value.filter((v) => !(inChildren && isUnpublishedChild(v)) && !isUnpublishedChildHit(v)).map((v) => filterChildData(v, inChildren))
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      if (k === 'private_full_name') continue
      out[k] = filterChildData(v, inChildren)
    }
    return out
  }
  return value
}

// Public on the site: published status and the safeguarding `published`
// flag set (stored as 1/0 by SQLite, true/false elsewhere).
function isVisibleChild(item: { status?: string; data?: Record<string, any> }): boolean {
  return item.status === 'published' && Boolean(item.data?.published)
}

function isUnpublishedChild(v: unknown): boolean {
  const item = v as { status?: string; data?: Record<string, any> }
  return Boolean(item && typeof item === 'object' && 'data' in item && !isVisibleChild(item))
}

// Search hits name their collection; drop child hits outright (search
// results don't carry the safeguarding flag).
function isUnpublishedChildHit(v: unknown): boolean {
  const hit = v as { collection?: string; type?: string }
  return Boolean(hit && typeof hit === 'object' && (hit.collection === CHILDREN || hit.type === CHILDREN) && !('data' in hit))
}
