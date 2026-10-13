// Step 4: snapshot (+ EmDash media map) → seed files.
//
// seed/seed.local.json  full seed: children + EmDash media values (gitignored;
//                       media ids are specific to the local database)
// seed/seed.json        committed: no children (public repo), no media values
//
// Collections that exist on the live site are replaced wholesale; project-
// only collections (posts, campaign_*) keep their current entries.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  mapChildren,
  mapCorporateTiers,
  mapEvents,
  mapPageFaqs,
  mapResources,
  mapTeam,
  mergePartners,
} from './mappers.mjs'
import { MEDIA_MAP_PATH } from './media.mjs'
import { LOCAL_SEED_PATH, ROOT_DIR, SEED_PATH, SNAPSHOT_DIR } from './lib/paths.mjs'
import { projectPathFor } from '../../src/lib/legacyRoutes.mjs'
import { MANIFEST_PATH } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'
import { translate } from './lib/align.mjs'
import { loadManifests, PAGE_COPY_ES_PATH, translationTable } from './pagecopy.mjs'
import { relativizeSameSiteLinks } from '../../src/lib/site.mjs'

const MEDIA_FILE_BASE_URL = '/_emdash/api/media/file'

function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback
}

const snap = (name) => readJson(path.join(SNAPSHOT_DIR, `${name}.json`))

export function createContext(mediaMap) {
  const notes = []
  const missing = new Set()
  // A media item is harvested once, with the first description found (the
  // English page's). Pass the page's own `alt` to describe the image in that
  // page's language, e.g. a Spanish event's photos.
  const media = (src, alt) => {
    if (!src) return undefined
    const value = mediaMap[src]
    if (!value) missing.add(src)
    return value && alt && alt !== value.alt ? { ...value, alt } : value
  }
  return {
    notes,
    missing,
    media,
    mediaUrl: (src) => {
      const key = media(src)?.meta?.storageKey
      return key ? `${MEDIA_FILE_BASE_URL}/${key}` : undefined
    },
    note: (msg) => notes.push(msg),
  }
}

function buildContent(snapshots, mediaMap) {
  const ctx = createContext(mediaMap)
  const events = mapEvents(snapshots.events, ctx)
  const live = {
    team_members: mapTeam(snapshots.team_members, ctx),
    children: mapChildren(snapshots.children, ctx),
    events: events.events,
    sponsorship_packages: [...mapCorporateTiers(snapshots.corporate_tiers), ...events.sponsorship_packages],
    sponsors: mergePartners(events.sponsors, snapshots.partners ?? [], ctx),
    // No auction items are published on the live site.
    auction_items: [],
    faqs: [...mapPageFaqs(snapshots.faqs, ctx), ...events.faqs],
    resources: mapResources(snapshots.resources, ctx),
  }
  return { live, ctx }
}

// Event content kept in the mapper (EVENT_EXTRAS) is English; its Spanish
// comes from the live /es event page through the translation table.
const TRANSLATED_EXTRAS = ['appeal_heading', 'appeal_text', 'appeal_image_alt', 'appeal_caption', 'appeal_cards_label', 'appeal_cta_label']

function translateExtras(data, table) {
  const t = (v) => translate(table, v) ?? v
  const out = { ...data }
  for (const key of TRANSLATED_EXTRAS) if (typeof out[key] === 'string') out[key] = t(out[key])
  if (Array.isArray(out.appeal_cards)) {
    out.appeal_cards = out.appeal_cards.map((c) => ({ ...c, title: t(c.title), text: t(c.text), image_alt: t(c.image_alt) }))
  }
  return out
}

// Spanish terms chosen here over the live /es site's, keyed by collection,
// field and English value. The live Spanish was machine translated and hasn't
// been audited; these are stopgaps until marketing reviews the translations
// in the CMS. "Patrocinador" for the Trustee tier read as the generic word for
// any sponsor (review finding on PR #15).
export const SPANISH_TERMS = {
  sponsorship_packages: { tier_name: { Trustee: 'Benefactor' } },
}

function withSpanishTerms(collection, enData, data) {
  const out = { ...data }
  for (const [field, terms] of Object.entries(SPANISH_TERMS[collection] ?? {})) {
    const term = terms[enData[field]]
    if (term) out[field] = term
  }
  return out
}

// Spanish entries for every English entry that has a live Spanish version.
// Pairs by entry id (ids derive from slugs, which are the same in both
// locales) and, for ids built from translated names (e.g. corporate tier
// names), by position when both sides have the same number left over. Each
// Spanish entry starts from its English data (dates, images, numbers the
// Spanish page doesn't restate) overlaid with the Spanish values, references
// point at the English entries' ids, and it is linked as a translation.
export function translatedEntries(live, liveEs, table = new Map()) {
  const idMap = new Map()
  const pairs = {}
  const unpaired = []
  for (const [collection, enEntries] of Object.entries(live)) {
    const esEntries = liveEs[collection] ?? []
    const enIds = new Set(enEntries.map((e) => e.id))
    const esById = new Map(esEntries.map((e) => [e.id, e]))
    const enLeft = enEntries.filter((e) => !esById.has(e.id))
    const esLeft = esEntries.filter((e) => !enIds.has(e.id))
    const positional = enLeft.length === esLeft.length
    pairs[collection] = enEntries.flatMap((en) => {
      const es = esById.get(en.id) ?? (positional ? esLeft[enLeft.indexOf(en)] : undefined)
      if (!es) {
        unpaired.push(`${collection}: ${en.id}`)
        return []
      }
      idMap.set(es.id, en.id)
      return [[en, es]]
    })
  }
  const remapRefs = (value) =>
    typeof value === 'string' && value.startsWith('$ref:')
      ? `$ref:${idMap.get(value.slice(5)) ?? value.slice(5)}`
      : Array.isArray(value)
        ? value.map(remapRefs)
        : value
  const out = {}
  for (const [collection, list] of Object.entries(pairs)) {
    out[collection] = list.map(([en, es]) => {
      let data = Object.fromEntries(Object.entries({ ...en.data, ...es.data }).map(([k, v]) => [k, remapRefs(v)]))
      if (collection === 'events') data = translateExtras(data, table)
      data = withSpanishTerms(collection, en.data, data)
      return {
        id: `${en.id}--es`,
        ...(en.slug ? { slug: en.slug } : {}),
        status: en.status,
        locale: 'es',
        translationOf: en.id,
        data,
      }
    })
  }
  return { entries: out, unpaired }
}

// `page_copy` entries for every slot declared in code: English with the
// default from code, Spanish with the live translation (seed/page-copy.es.json)
// where one exists. A fresh database (CI, `npm run seed`) gets the same rows
// the static-page sync would create; the sync then finds them and creates
// nothing. Existing databases are filled by `npm run migrate:import-copy`.
export function pageCopyEntries(manifests, spanish = {}) {
  const valueField = (format, value) =>
    format === 'rich' ? { rich_value: value } : format === 'image' ? { image_value: { src: value } } : { value }
  return manifests.flatMap((manifest) =>
    Object.entries(manifest.slots).flatMap(([key, spec]) => {
      const format = spec.format ?? 'plain'
      const meta = { route_path: manifest.route, key, label: spec.label, format, max_length: spec.maxLength, stale: false }
      // Rows without a slug keep their seed id as their database id, so it must
      // be URL-safe: copy--<route>--<key> (e.g. copy--events-x--hero.heading).
      const id = `copy--${manifest.route.replace(/\*/g, 'x').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'home'}--${key.replace(/[^A-Za-z0-9._-]+/g, '-')}`
      const es = spanish[manifest.route]?.[key]
      return [
        { id, status: 'published', data: { ...meta, ...valueField(format, spec.default) } },
        { id: `${id}--es`, status: 'published', locale: 'es', translationOf: id, data: { ...meta, ...(es ? valueField(format, es) : {}) } },
      ]
    })
  )
}

// Sponsor IDs come from the sponsor's name, and the live Spanish pages
// sometimes translate a company name ("The Trusty Handyman" → "El manitas de
// confianza"), which would point the Spanish event at a sponsor that doesn't
// exist. A Spanish sponsor with the same logo as an English one keeps the
// English name.
export function alignSponsorNames(eventsEn = [], eventsEs = []) {
  const nameByLogo = new Map()
  for (const e of eventsEn) for (const s of e.sponsors ?? []) if (s.logo?.src) nameByLogo.set(s.logo.src, s.name)
  return eventsEs.map((e) => ({
    ...e,
    sponsors: (e.sponsors ?? []).map((s) => (s.logo?.src && nameByLogo.has(s.logo.src) ? { ...s, name: nameByLogo.get(s.logo.src) } : s)),
  }))
}

function withTranslations(live, es) {
  return Object.fromEntries(Object.entries(live).map(([k, v]) => [k, [...v, ...(es[k] ?? [])]]))
}

// Pure core: snapshots (+ Spanish snapshots) + media map + current seed →
// { full, public, ctx }.
export function buildSeeds({ snapshots, snapshotsEs, mediaMap, currentSeed, table }) {
  const { live, ctx } = buildContent(snapshots, mediaMap)
  const { live: liveNoMedia } = buildContent(snapshots, {})
  let full = live
  let pub = liveNoMedia
  let unpaired = []
  if (snapshotsEs) {
    const es = translatedEntries(live, buildContent(snapshotsEs, mediaMap).live, table)
    const esNoMedia = translatedEntries(liveNoMedia, buildContent(snapshotsEs, {}).live, table)
    full = withTranslations(live, es.entries)
    pub = withTranslations(liveNoMedia, esNoMedia.entries)
    unpaired = es.unpaired
  }
  // Links back into the site are stored as paths (the live site writes some
  // as full addresses), so pages show them in the reader's language.
  const content = (c) => relativizeSameSiteLinks(c)
  return {
    full: { ...currentSeed, content: content({ ...currentSeed.content, ...full }) },
    public: { ...currentSeed, content: content({ ...currentSeed.content, ...pub, children: [] }) },
    ctx,
    unpaired,
    counts: Object.fromEntries(Object.entries(full).map(([k, v]) => [k, v.length])),
  }
}

// Live title/description/share image for each static page, keyed by the
// project route (Layout.astro reads src/data/page-seo.json). CMS detail pages
// get their SEO from EmDash fields instead.
export function buildPageSeo(pageSnapshots, manifest) {
  const seo = {}
  for (const snap of pageSnapshots) {
    if (/^\/events\//.test(snap.path)) continue
    const img = snap.seo?.ogImage
    const local = img && manifest[img] ? `/${manifest[img].path.replace(/^public\//, '')}` : undefined
    seo[projectPathFor(snap.path)] = compact({ title: snap.seo?.title, description: snap.seo?.description, image: local })
  }
  return seo
}

function compact(o) {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v))
}

export async function transform() {
  const report = createSection('Transform')
  const mediaMap = readJson(MEDIA_MAP_PATH, {})
  const snapshots = {
    team_members: snap('team_members'),
    children: snap('children') ?? { order: [], items: [] },
    events: snap('events'),
    corporate_tiers: snap('corporate_tiers'),
    faqs: snap('faqs'),
    resources: snap('resources'),
    partners: snap('partners'),
  }
  const snapEs = (name) => snap(`es/${name}`)
  const snapshotsEs = snapEs('events')
    ? {
        team_members: snapEs('team_members'),
        children: snapEs('children') ?? { order: [], items: [] },
        events: alignSponsorNames(snap('events'), snapEs('events')),
        corporate_tiers: snapEs('corporate_tiers'),
        faqs: snapEs('faqs'),
        resources: snapEs('resources'),
        partners: snapEs('partners'),
      }
    : undefined
  const currentSeed = readJson(SEED_PATH)
  currentSeed.content = { ...currentSeed.content, page_copy: pageCopyEntries(await loadManifests(), readJson(PAGE_COPY_ES_PATH, {})) }
  const { full, public: publicSeed, ctx, counts, unpaired } = buildSeeds({
    snapshots,
    snapshotsEs,
    mediaMap,
    currentSeed,
    table: translationTable(),
  })

  const pagesDir = path.join(SNAPSHOT_DIR, 'pages')
  const pageSnapshots = readdirSync(pagesDir).filter((f) => f.endsWith('.json')).map((f) => readJson(path.join(pagesDir, f)))
  const pageSeo = buildPageSeo(pageSnapshots, readJson(MANIFEST_PATH, {}))
  mkdirSync(path.join(ROOT_DIR, 'src/data'), { recursive: true })
  writeFileSync(path.join(ROOT_DIR, 'src/data/page-seo.json'), `${JSON.stringify(pageSeo, null, 2)}\n`)

  writeFileSync(LOCAL_SEED_PATH, `${JSON.stringify(full, null, 2)}\n`)
  writeFileSync(SEED_PATH, `${JSON.stringify(publicSeed, null, 2)}\n`)

  report.line('| Collection | Entries |')
  report.line('| --- | --- |')
  for (const [k, v] of Object.entries(counts)) report.line(`| ${k} | ${v} |`)
  report.line()
  report.line(snapshotsEs ? '- Counts include Spanish entries (linked translations of the English ones).' : '- No Spanish snapshot: English only.')
  if (unpaired.length) {
    report.line(`- English entries with no Spanish version on the live site (${unpaired.length}); they fall back to English:`)
    report.list(unpaired)
  }
  report.line(`- \`seed/seed.json\` (committed) omits the ${counts.children} children and all media values; \`seed/seed.local.json\` (gitignored) has both.`)
  report.line(
    ctx.missing.size
      ? `- Media not yet in EmDash (${ctx.missing.size}); image fields left empty. Run \`npm run seed\` to import media first.`
      : '- Media: every referenced file resolved to an EmDash media item.'
  )
  if (ctx.notes.length) {
    report.line('- Decisions and dropped content:')
    report.list([...new Set(ctx.notes)])
  }
  report.write()
  return { ...counts, missingMedia: ctx.missing.size }
}
