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

const MEDIA_FILE_BASE_URL = '/_emdash/api/media/file'

function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback
}

const snap = (name) => readJson(path.join(SNAPSHOT_DIR, `${name}.json`))

export function createContext(mediaMap) {
  const notes = []
  const missing = new Set()
  const media = (src) => {
    if (!src) return undefined
    const value = mediaMap[src]
    if (!value) missing.add(src)
    return value
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

// Pure core: snapshots + media map + current seed → { full, public, ctx }.
export function buildSeeds({ snapshots, mediaMap, currentSeed }) {
  const { live, ctx } = buildContent(snapshots, mediaMap)
  const full = { ...currentSeed, content: { ...currentSeed.content, ...live } }
  const { live: liveNoMedia } = buildContent(snapshots, {})
  const publicSeed = { ...currentSeed, content: { ...currentSeed.content, ...liveNoMedia, children: [] } }
  return { full, public: publicSeed, ctx, counts: Object.fromEntries(Object.entries(live).map(([k, v]) => [k, v.length])) }
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
  const currentSeed = readJson(SEED_PATH)
  const { full, public: publicSeed, ctx, counts } = buildSeeds({ snapshots, mediaMap, currentSeed })

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
