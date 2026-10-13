import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { EmDashApiError, EmDashClient } from 'emdash/client'
import { copyCollectionFor } from './cmsNavigation.mjs'
import { slotLayout } from './copyCollections.mjs'
import { GLOBAL_ROUTE, slotFormat, type CopyManifest, type SlotSpec } from './copy'
import { DEFAULT_LOCALE, LOCALES, type Locale } from './i18n'

// [slug].astro detail routes and their matching index.astro listing route
// are already represented by their own EmDash collection - excluded here so
// the `pages` collection only covers routes with no other EmDash presence.
// (A listing route still gets a `pages` row when it declares copy slots.)
const COLLECTION_INDEX_ROUTES = new Set([
  'blog/index.astro',
  'events/index.astro',
  'our-team/index.astro',
  'resources/index.astro',
  'sponsor-a-child/children/index.astro',
])

export interface StaticPageRoute {
  routePath: string
  sourceFile: string
}

function toRoutePath(relFile: string): string {
  const withoutIndex = relFile.replace(/(^|\/)index\.astro$/, '')
  const withoutExt = withoutIndex.replace(/\.astro$/, '')
  const route = `/${withoutExt}`.replace(/\/+/g, '/').replace(/\/$/, '')
  return route === '' ? '/' : route
}

export function scanStaticPageRoutes(pagesDir: string): StaticPageRoute[] {
  const entries = readdirSync(pagesDir, { recursive: true }) as string[]
  const relPaths = entries.map((entry) => entry.split(/[\\/]/).join('/'))

  return relPaths
    .filter((rel) => rel.endsWith('.astro'))
    .filter((rel) => !rel.includes('[')) // dynamic routes belong to a collection
    .filter((rel) => !COLLECTION_INDEX_ROUTES.has(rel))
    .map((rel) => ({
      routePath: toRoutePath(rel),
      sourceFile: `src/pages/${rel}`,
    }))
    .sort((a, b) => a.routePath.localeCompare(b.routePath))
}

// A copy manifest together with the page file that uses it (for the
// `pages` inventory row of routes found only through their manifest).
export interface ManifestSource {
  manifest: CopyManifest
  sourceFile: string
}

// Copy manifests are `_copy.ts` files next to their page; each default-exports
// one manifest or an array of them (e.g. one per resource category). Keys are
// module paths as returned by import.meta.glob ('/src/pages/events/_copy.ts').
export function manifestSources(
  modules: Record<string, { default: CopyManifest | CopyManifest[] }>,
  rootDir: string
): ManifestSource[] {
  return Object.entries(modules).flatMap(([modulePath, mod]) => {
    const rel = modulePath.replace(/^\//, '')
    const manifests = Array.isArray(mod.default) ? mod.default : [mod.default]
    return manifests.map((manifest) => ({ manifest, sourceFile: pageFileNextTo(rel, rootDir) }))
  })
}

// The page a manifest belongs to: for `_copy.detail.ts` the directory's
// dynamic template ([slug].astro); for `_copy.ts` its index.astro, else the
// directory's only other page (e.g. [category].astro); else the manifest
// itself (site-wide copy).
function pageFileNextTo(relManifest: string, rootDir: string): string {
  const dir = path.posix.dirname(relManifest)
  const abs = path.join(rootDir, dir)
  if (relManifest.endsWith('_copy.detail.ts')) {
    const template = existsSync(abs) ? readdirSync(abs).find((f) => f.startsWith('[') && f.endsWith('.astro')) : undefined
    return template ? `${dir}/${template}` : relManifest
  }
  if (existsSync(path.join(abs, 'index.astro'))) return `${dir}/index.astro`
  const page = existsSync(abs) ? readdirSync(abs).find((f) => f.endsWith('.astro')) : undefined
  return page ? `${dir}/${page}` : relManifest
}

// The subset of EmDashClient the sync uses (injectable for tests).
type Client = Pick<EmDashClient, 'listAll' | 'create' | 'update' | 'publish' | 'delete'>
type Item = Awaited<ReturnType<Client['create']>>

export interface SyncStaticPagesOptions {
  baseUrl: string
  token: string
  pagesDir: string
  manifests?: ManifestSource[]
  client?: Client
}

export interface SyncStaticPagesResult {
  created: number
  updated: number
  markedStale: number
  slotsCreated: number
  slotsUpdated: number
  slotsMarkedStale: number
  // Duplicate rows (e.g. from overlapping sync runs) moved to trash.
  duplicatesRemoved: number
  // Translations found on a row not linked to its English row (created
  // without `translationOf`), moved onto the linked row before the duplicate
  // was trashed.
  translationsRescued: number
  // Slots with two different translations in one locale: nothing is trashed
  // and a person has to choose (`<route>#<key> (<locale>)`).
  translationConflicts: string[]
  // Slots whose metadata changed in code but that have an unpublished editor
  // draft: left alone so the sync never publishes someone's draft.
  slotsSkippedForDraft: string[]
  // Copy collections that don't exist yet (run `npm run cms:schema`); their
  // pages render defaults until then. The sync never creates collections.
  collectionsMissing: string[]
}

async function listAll(client: Client, collection: string, locale?: Locale): Promise<Item[]> {
  const items: Item[] = []
  for await (const item of client.listAll(collection, locale ? { locale } : undefined)) items.push(item as Item)
  return items
}

/**
 * Keeps the `pages` inventory and each page's copy collection in step with code:
 *
 * - one `pages` row per route per locale, for every static route on disk and
 *   every route that declares copy; rows whose route is gone are flagged
 *   stale, never deleted;
 * - one published row per declared slot per locale in the manifest's copy
 *   collection (English with the default from code, Spanish empty so it falls
 *   back); label, title, section, number, format and max length follow code,
 *   values are never overwritten, and slots no longer declared are flagged
 *   stale. Copy collections themselves come from `npm run cms:schema`.
 *
 * See openspec/changes/marketing-editing-and-localization/design.md (D9) and
 * openspec/changes/organize-cms-admin-navigation/design.md (D5).
 */
export async function syncStaticPages(options: SyncStaticPagesOptions): Promise<SyncStaticPagesResult> {
  const client = options.client ?? new EmDashClient({ baseUrl: options.baseUrl, token: options.token })
  const manifests = options.manifests ?? []
  const result: SyncStaticPagesResult = {
    created: 0,
    updated: 0,
    markedStale: 0,
    slotsCreated: 0,
    slotsUpdated: 0,
    slotsMarkedStale: 0,
    duplicatesRemoved: 0,
    translationsRescued: 0,
    translationConflicts: [],
    slotsSkippedForDraft: [],
    collectionsMissing: [],
  }

  await syncPages(client, routesToSync(options.pagesDir, manifests), result)
  await syncSlots(client, manifests, result)
  return result
}

function routesToSync(pagesDir: string, manifests: ManifestSource[]): StaticPageRoute[] {
  const routes = new Map(scanStaticPageRoutes(pagesDir).map((r) => [r.routePath, r]))
  for (const { manifest, sourceFile } of manifests) {
    if (manifest.route !== GLOBAL_ROUTE && !routes.has(manifest.route)) {
      routes.set(manifest.route, { routePath: manifest.route, sourceFile })
    }
  }
  return [...routes.values()].sort((a, b) => a.routePath.localeCompare(b.routePath))
}

// Keeps one English row per key (the oldest) and, per other locale, one row
// in that English row's translation group; every other row for the key is
// moved to trash. Returns the kept rows. Rows normally can't be duplicated —
// this heals what overlapping sync runs may have created.
//
// With `translationOf` (the translated fields of a row, when it has any), a
// translation is never thrown away: a duplicate holding text the kept row
// lacks — typically a translation created without `translationOf`, so not
// linked to its English row — has its text moved onto the kept (linked) row
// first, which is created if missing. Duplicates holding a different text
// than the kept row, or than each other, are all left in place and reported.
async function dedupe(
  client: Client,
  collection: string,
  byLocale: Map<Locale, Item[]>,
  keyOf: (item: Item) => string,
  result: SyncStaticPagesResult,
  translationOf?: (item: Item) => Record<string, unknown> | undefined
): Promise<Map<Locale, Item[]>> {
  const oldestFirst = (a: Item, b: Item) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)
  const keptEnglish = new Map<string, Item>()
  for (const item of [...byLocale.get(DEFAULT_LOCALE)!].sort(oldestFirst)) {
    if (!keptEnglish.has(keyOf(item))) keptEnglish.set(keyOf(item), item)
  }
  const kept = new Map<Locale, Item[]>()
  const discard: Item[] = []
  for (const [locale, items] of byLocale) {
    const rows = new Map<string, Item[]>()
    for (const item of [...items].sort(oldestFirst)) rows.set(keyOf(item), [...(rows.get(keyOf(item)) ?? []), item])
    const keep: Item[] = []
    for (const [key, candidates] of rows) {
      const english = keptEnglish.get(key)
      const belongs = (item: Item) =>
        locale === DEFAULT_LOCALE ? english?.id === item.id : !english || item.translationGroup === english.translationGroup
      let keeper = candidates.find(belongs)
      let others = candidates.filter((item) => item !== keeper)
      if (locale !== DEFAULT_LOCALE && english && translationOf) {
        const outcome = await rescueTranslation(client, collection, locale, english, keeper, others, translationOf, result, key)
        keeper = outcome.keeper
        others = outcome.discard
      }
      if (keeper) keep.push(keeper)
      discard.push(...others)
    }
    kept.set(locale, keep)
  }
  for (const item of discard) {
    await client.delete(collection, item.id)
    result.duplicatesRemoved += 1
  }
  return kept
}

// Decides what happens to a key's duplicate rows in a translated locale so
// that no translated text is lost; returns the row to keep and the rows that
// are safe to trash.
async function rescueTranslation(
  client: Client,
  collection: string,
  locale: Locale,
  english: Item,
  keeper: Item | undefined,
  others: Item[],
  translationOf: (item: Item) => Record<string, unknown> | undefined,
  result: SyncStaticPagesResult,
  key: string
): Promise<{ keeper: Item | undefined; discard: Item[] }> {
  const same = (a: Record<string, unknown>, b: Record<string, unknown>) => JSON.stringify(a) === JSON.stringify(b)
  const kept = keeper && translationOf(keeper)
  const withText = others.filter((item) => translationOf(item) && !(kept && same(translationOf(item)!, kept)))
  const texts = withText.map((item) => translationOf(item)!).filter((t, i, all) => all.findIndex((u) => same(t, u)) === i)
  const empty = others.filter((item) => !withText.includes(item))
  if (texts.length === 0) return { keeper, discard: others }
  // Two different translations, or one that the linked row (or its open
  // editor draft) would overwrite: a person chooses.
  if (texts.length > 1 || kept || keeper?.draftRevisionId) {
    result.translationConflicts.push(`${key} (${locale})`)
    return { keeper, discard: empty }
  }
  const text = texts[0]
  if (keeper) {
    await client.update(collection, keeper.id, { data: text, _rev: keeper._rev })
    await client.publish(collection, keeper.id)
  } else {
    const source = withText[0]
    keeper = await client.create(collection, { status: 'draft', locale, translationOf: english.id, data: { ...source.data, ...text } })
    await client.publish(collection, keeper.id)
  }
  result.translationsRescued += 1
  return { keeper, discard: others }
}

async function syncPages(client: Client, routes: StaticPageRoute[], result: SyncStaticPagesResult) {
  const now = new Date().toISOString()
  const byLocale = await dedupe(
    client,
    'pages',
    new Map(await Promise.all(LOCALES.map(async (l) => [l, await listAll(client, 'pages', l)] as const))),
    (item) => String(item.data.route_path),
    result
  )
  const seen = new Set(routes.map((r) => r.routePath))

  for (const route of routes) {
    const data = { route_path: route.routePath, source_file: route.sourceFile, last_synced_at: now, stale: false }
    let englishId: string | undefined
    for (const locale of LOCALES) {
      const match = byLocale.get(locale)!.find((item) => item.data.route_path === route.routePath)
      if (match) {
        await client.update('pages', match.id, { data, _rev: match._rev })
        result.updated += 1
      } else {
        // `pages` has no draft/publish workflow (sync-owned inventory); rows
        // stay in their creation status.
        const created = await client.create('pages', {
          status: 'draft',
          data,
          locale,
          ...(locale !== DEFAULT_LOCALE && englishId ? { translationOf: englishId } : {}),
        })
        result.created += 1
        if (locale === DEFAULT_LOCALE) englishId = created.id
        continue
      }
      if (locale === DEFAULT_LOCALE) englishId = match.id
    }
  }

  for (const items of byLocale.values()) {
    for (const item of items) {
      const routePath = item.data.route_path as string | undefined
      if (routePath && !seen.has(routePath) && item.data.stale !== true) {
        await client.update('pages', item.id, { data: { ...item.data, stale: true }, _rev: item._rev })
        result.markedStale += 1
      }
    }
  }
}

type SlotLayout = { section: string; position: number; title: string }

function slotMeta(key: string, spec: SlotSpec, layout: SlotLayout) {
  return {
    key,
    label: spec.label,
    title: layout.title,
    section: layout.section,
    position: layout.position,
    format: slotFormat(spec),
    max_length: spec.maxLength ?? null,
  }
}

const META_FIELDS = ['label', 'title', 'section', 'position', 'format', 'max_length'] as const

function slotDefault(spec: SlotSpec): Record<string, unknown> {
  switch (slotFormat(spec)) {
    case 'rich':
      return { rich_value: spec.default }
    case 'image':
      return { image_value: { src: spec.default } }
    default:
      return { value: spec.default }
  }
}

const slotId = (route: unknown, key: unknown) => `${route}#${key}`

// A slot row's translated value fields, when it holds any text or image.
function slotTranslation(item: Item): Record<string, unknown> | undefined {
  const { value, rich_value, image_value } = item.data as Record<string, any>
  const hasValue = (typeof value === 'string' && value.trim()) || (Array.isArray(rich_value) && rich_value.length) || image_value
  return hasValue ? { value: value ?? null, rich_value: rich_value ?? null, image_value: image_value ?? null } : undefined
}

async function syncSlots(client: Client, manifests: ManifestSource[], result: SyncStaticPagesResult) {
  for (const { manifest } of manifests) {
    const collection = copyCollectionFor(manifest.route) as string
    let listed: Map<Locale, Item[]>
    try {
      listed = new Map(await Promise.all(LOCALES.map(async (l) => [l, await listAll(client, collection, l)] as const)))
    } catch (error) {
      if (error instanceof EmDashApiError && error.status === 404) {
        result.collectionsMissing.push(collection)
        continue
      }
      throw error
    }
    await syncManifestSlots(client, collection, manifest, await dedupe(client, collection, listed, (item) => slotId(manifest.route, item.data.key), result, slotTranslation), result)
  }
}

async function syncManifestSlots(
  client: Client,
  collection: string,
  manifest: CopyManifest,
  byLocale: Map<Locale, Item[]>,
  result: SyncStaticPagesResult
) {
  const english = byLocale.get(DEFAULT_LOCALE)!
  const others = new Map([...byLocale].filter(([l]) => l !== DEFAULT_LOCALE))
  const englishByKey = new Map(english.map((item) => [String(item.data.key), item]))
  const layout = slotLayout(manifest) as Map<string, SlotLayout>

  // Non-translatable fields (key, label, title, section, number, format, max
  // length, stale) are copied to the other locales by EmDash, so metadata is
  // written on the English row only; it's staged as a draft (revisions) and
  // published here, unless an editor already has a draft open on it.
  const writeMeta = async (item: Item, data: Record<string, unknown>) => {
    if (item.draftRevisionId) {
      result.slotsSkippedForDraft.push(slotId(manifest.route, item.data.key))
      return false
    }
    await client.update(collection, item.id, { data, _rev: item._rev })
    await client.publish(collection, item.id)
    return true
  }

  for (const [key, spec] of Object.entries(manifest.slots)) {
    const meta = slotMeta(key, spec, layout.get(key)!)
    let en = englishByKey.get(key)

    if (!en) {
      en = await client.create(collection, { status: 'draft', locale: DEFAULT_LOCALE, data: { ...meta, ...slotDefault(spec), stale: false } })
      await client.publish(collection, en.id)
      result.slotsCreated += 1
    } else {
      const changed = META_FIELDS.some((f) => (en!.data[f] ?? null) !== meta[f]) || en.data.stale === true
      if (changed && (await writeMeta(en, { ...meta, stale: false }))) result.slotsUpdated += 1
    }

    for (const [locale, items] of others) {
      const hasTranslation = items.some((item) => item.translationGroup === en!.translationGroup || item.data.key === key)
      if (hasTranslation) continue
      const created = await client.create(collection, {
        status: 'draft',
        locale,
        translationOf: en.id,
        data: { ...meta, stale: false },
      })
      await client.publish(collection, created.id)
      result.slotsCreated += 1
    }
  }

  for (const item of english) {
    if (String(item.data.key) in manifest.slots || item.data.stale === true) continue
    if (await writeMeta(item, { stale: true })) result.slotsMarkedStale += 1
  }
}
