// Step: live Spanish page copy → seed/page-copy.es.json
//
// Every copy slot declared in code (src/pages/**/_copy*.ts, src/copy/_copy.ts)
// has an English default copied from the live site. This step aligns each live
// English page with its /es counterpart (scripts/migrate/lib/align.mjs) into an
// English → Spanish table and looks up every slot default in it. Results go to
// seed/page-copy.es.json (route → key → Spanish value), which `importCopy`
// writes into the Spanish `page_copy` rows. Slots with no translation are
// listed in the migration report.
//
// Child pages are used only to translate interface text in memory; the
// committed table (snapshot/es/translations.json) is built from other pages.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build } from 'esbuild'
import { load } from 'cheerio'
import { fetchText } from './lib/http.mjs'
import { alignPages, corrected, mergeTables, translate } from './lib/align.mjs'
import { LIVE_BASE_URL, ROOT_DIR, SNAPSHOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'
import { sanitizeRichText, toPortableText } from './lib/richtext.mjs'
import { relativizeSameSiteLinks } from '../../src/lib/site.mjs'
import { projectPathFor } from '../../src/lib/legacyRoutes.mjs'

const GLOBAL = '_global'
export const PAGE_COPY_ES_PATH = path.join(ROOT_DIR, 'seed/page-copy.es.json')
const TRANSLATIONS_PATH = path.join(SNAPSHOT_DIR, 'es/translations.json')

const readJson = (file, fallback) => (existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback)

// The manifests are TypeScript with extensionless imports: bundle them.
export async function loadManifests() {
  const files = (readdirSync(path.join(ROOT_DIR, 'src/pages'), { recursive: true }))
    .map((f) => f.split(path.sep).join('/'))
    .filter((f) => /(^|\/)_copy(\.detail)?\.ts$/.test(f))
    .map((f) => `src/pages/${f}`)
    .concat('src/copy/_copy.ts')
  const entry = files.map((f, i) => `export { default as m${i} } from ${JSON.stringify(path.join(ROOT_DIR, f))}`).join('\n')
  const outfile = path.join(ROOT_DIR, 'scripts/migrate/.cache/manifests.bundle.mjs')
  await build({ stdin: { contents: entry, resolveDir: ROOT_DIR, loader: 'ts' }, bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'error' })
  const mod = await import(`${pathToFileURL(outfile).href}?t=${Date.now()}`)
  return Object.values(mod).flatMap((m) => (Array.isArray(m) ? m : [m]))
}

async function livePair(livePath) {
  const en = await fetchText(`${LIVE_BASE_URL}${livePath}`)
  const es = await fetchText(`${LIVE_BASE_URL}/es${livePath === '/' ? '' : livePath}`)
  return { en, es }
}

// The live privacy policy body, sanitized and converted like the English one.
function privacyBody(html) {
  const $ = load(html)
  const section = $('.claude_temp-legal_body-section .w-richtext').first().html() ?? $('.w-richtext').first().html()
  return section ? toPortableText(sanitizeRichText(section).html, 'pp') : undefined
}

export async function pageCopy() {
  const report = createSection('Spanish page copy')
  const sitemap = readJson(path.join(SNAPSHOT_DIR, 'sitemap.json'), { urls: [] })
  const children = readJson(path.join(SNAPSHOT_DIR, 'children.json'), { items: [] }).items

  const publicTables = []
  const childTables = []
  let privacyEs
  const manifests = await loadManifests()
  // Pages in the sitemap snapshot, plus any declared page route the live site
  // has (e.g. pages added there after the snapshot); others are skipped.
  const extra = manifests.map((m) => m.route).filter((r) => r.startsWith('/') && !r.includes('*') && !sitemap.urls.includes(r))
  const livePaths = [...sitemap.urls]
  for (const route of extra) {
    try {
      await livePair(route)
      livePaths.push(route)
    } catch {
      // Not on the live site (e.g. pages new to this project).
    }
  }
  // Each live page's own table, by project route: a slot is translated from
  // its own page first, so a string that differs by context (or a misaligned
  // node elsewhere) can't leak in from another page.
  const pageTables = new Map()
  for (const livePath of livePaths) {
    const { en, es } = await livePair(livePath)
    const t = alignPages(en, es)
    publicTables.push(t)
    pageTables.set(projectPathFor(livePath), t)
    if (livePath === '/privacy-policy') privacyEs = privacyBody(es)
  }
  // Template routes (/events/*) take the tables of the pages they render.
  const tablesFor = (route) => {
    if (!route.includes('*')) return pageTables.has(route) ? [pageTables.get(route)] : undefined
    const prefix = route.replace('*', '')
    const own = [...pageTables].filter(([r]) => r.startsWith(prefix) && r !== prefix.replace(/\/$/, '')).map(([, t]) => t)
    return own.length ? own : undefined
  }
  for (const c of children.slice(0, 3)) {
    const { en, es } = await livePair(new URL(c.url).pathname)
    childTables.push(alignPages(en, es))
  }
  const table = corrected(mergeTables([mergeTables(publicTables), ...childTables]))
  // The committed table must not carry child data: pages that list children
  // (Sponsor a Child, the listing) contain names and dreams.
  const childEs = readJson(path.join(SNAPSHOT_DIR, 'es/children.json'), { items: [] }).items
  const childStrings = [...children, ...childEs]
    .flatMap((c) => [c.displayName, c.dream, c.about])
    .filter((v) => typeof v === 'string' && v.trim().length > 2)
  const mentionsChild = (text) => childStrings.some((v) => text.includes(v))
  const publicTable = new Map([...corrected(mergeTables(publicTables))].filter(([en, es]) => !mentionsChild(en) && !mentionsChild(es)))
  mkdirSync(path.dirname(TRANSLATIONS_PATH), { recursive: true })
  writeFileSync(TRANSLATIONS_PATH, `${JSON.stringify(Object.fromEntries(publicTable), null, 2)}\n`)

  const out = {}
  const unmapped = []
  const noLivePage = []
  let mapped = 0
  for (const manifest of manifests) {
    const own = manifest.route === GLOBAL ? [] : tablesFor(manifest.route)
    if (!own) {
      // No live Spanish page: leave it untranslated (falls back to English)
      // rather than half-translate it from other pages' labels.
      noLivePage.push(manifest.route)
      continue
    }
    const pageTable = mergeTables([...own, table])
    for (const [key, spec] of Object.entries(manifest.slots)) {
      const format = spec.format ?? 'plain'
      if (format === 'image') continue
      let value
      if (format === 'rich') value = manifest.route === '/privacy-policy' && key === 'body' ? privacyEs : undefined
      else if (!/[A-Za-z]/.test(spec.default)) continue // numbers, symbols: same in every locale
      else if (spec.default.includes('\n')) {
        // Multi-line slots (e.g. the footer legal note) are separate text nodes live.
        const lines = spec.default.split('\n').map((l) => translate(pageTable, l))
        value = lines.every(Boolean) ? lines.join('\n') : undefined
      } else value = translate(pageTable, spec.default)
      if (value) {
        ;(out[manifest.route] ??= {})[key] = value
        mapped++
      } else unmapped.push(`${manifest.route} \`${key}\`: ${format === 'rich' ? '(rich text)' : spec.default}`)
    }
  }
  writeFileSync(PAGE_COPY_ES_PATH, `${JSON.stringify(relativizeSameSiteLinks(withManualTranslations(out)), null, 2)}\n`)

  report.line(`Aligned ${livePaths.length} live pages with their /es versions (${publicTable.size} translated strings).`)
  report.line(`- Slots translated: ${mapped}; without a live Spanish counterpart: ${unmapped.length} (they fall back to English).`)
  if (noLivePage.length) report.line(`- Pages with no live Spanish version (left for marketing to translate): ${noLivePage.join(', ')}`)
  if (unmapped.length) report.list(unmapped)
  report.write()
  return { translated: mapped, unmapped: unmapped.length }
}

// Spanish for slots with no counterpart on the live site, written and reviewed
// by a person: { route: { key: text } }. Merged into seed/page-copy.es.json
// after alignment and never overwritten by it. Marketing can still change
// them in the CMS like any slot.
export const MANUAL_TRANSLATIONS = {
  _global: {
    'a11y.newTab': '(se abre en una pestaña nueva)',
  },
}

export function withManualTranslations(out, manual = MANUAL_TRANSLATIONS) {
  const merged = structuredClone(out)
  for (const [route, slots] of Object.entries(manual)) merged[route] = { ...(merged[route] ?? {}), ...slots }
  return merged
}

// Translation table for other steps (e.g. event content kept in mappers).
export function translationTable() {
  return new Map(Object.entries(readJson(TRANSLATIONS_PATH, {})))
}
