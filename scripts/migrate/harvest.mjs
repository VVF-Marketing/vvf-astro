// Step 2: download every Webflow-hosted image/PDF the snapshot references.
//
// CMS media  → seed/media/<collection>/   (children → gitignored dir)
// Page media → public/images/pages/
// Site chrome (logo, favicons, share image) → public/
//
// seed/media/manifest.json maps source URL → local file + alt + hash, so a
// re-run only downloads URLs it hasn't stored yet. Child media gets its own
// manifest inside the gitignored seed/media/children/ directory.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fetchText, fetchWithRetry } from './lib/http.mjs'
import { load } from './lib/parse.mjs'
import { LIVE_BASE_URL, MANIFEST_PATH, MEDIA_DIR, PUBLIC_IMAGES_DIR, ROOT_DIR, SNAPSHOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'

const CDN_PATTERN = /^https:\/\/(?:cdn\.prod\.website-files\.com|uploads-ssl\.webflow\.com)\//
const CHILD_MANIFEST_PATH = path.join(MEDIA_DIR, 'children/manifest.json')

export function isWebflowAsset(url) {
  return typeof url === 'string' && CDN_PATTERN.test(url)
}

// Webflow file names look like `<24-hex id>_<id>_Name%20Here.jpg`; keep a
// short hash for uniqueness plus a readable, filesystem-safe tail.
export function localFileName(url) {
  const raw = decodeURIComponent(decodeURIComponent(new URL(url).pathname.split('/').pop() ?? 'file'))
  const ext = path.extname(raw).toLowerCase() || '.bin'
  const stem = raw
    .slice(0, raw.length - path.extname(raw).length)
    .replace(/^([0-9a-f]{24}_)+/i, '')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
    .toLowerCase()
  const hash = createHash('sha1').update(url).digest('hex').slice(0, 8)
  return `${hash}-${stem || 'file'}${ext}`
}

// Walks a snapshot value, yielding { url, alt } for every Webflow asset
// whether it appears as an { src, alt } object or a bare string.
export function* collectAssets(value) {
  if (Array.isArray(value)) {
    for (const v of value) yield* collectAssets(v)
  } else if (value && typeof value === 'object') {
    if (isWebflowAsset(value.src)) yield { url: value.src, alt: value.alt }
    for (const [k, v] of Object.entries(value)) if (k !== 'src') yield* collectAssets(v)
  } else if (isWebflowAsset(value)) {
    yield { url: value }
  } else if (typeof value === 'string' && value.includes('website-files.com')) {
    for (const m of value.matchAll(/https:\/\/cdn\.prod\.website-files\.com\/[^\s"'<>()]+/g)) yield { url: m[0] }
  }
}

// Decides where each asset goes. Returns Map(url → { dir, alt, manifest }).
export function planAssets(snapshots) {
  const plan = new Map()
  const add = (url, alt, dir, manifest) => {
    const existing = plan.get(url)
    // Child media wins: a photo used for a child must never land in a
    // committed directory, even if a page also references it.
    if (existing && (existing.manifest === 'children' || manifest !== 'children')) {
      if (!existing.alt && alt) existing.alt = alt
      return
    }
    plan.set(url, { dir, alt, manifest })
  }
  for (const { url, alt } of collectAssets(snapshots.children ?? [])) add(url, alt, 'seed/media/children', 'children')
  for (const { url, alt } of collectAssets(snapshots.partners ?? [])) add(url, alt, 'seed/media/sponsors', 'main')
  for (const name of ['team_members', 'events', 'resources']) {
    for (const { url, alt } of collectAssets(snapshots[name] ?? [])) add(url, alt, `seed/media/${name}`, 'main')
  }
  for (const { url, alt } of collectAssets(snapshots.pages ?? {})) add(url, alt, 'public/images/pages', 'main')
  return plan
}

function readJson(file, fallback) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : fallback
}

function readSnapshots() {
  const pagesDir = path.join(SNAPSHOT_DIR, 'pages')
  const pages = Object.fromEntries(
    readdirSync(pagesDir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f.replace(/\.json$/, ''), readJson(path.join(pagesDir, f))])
  )
  const read = (n) => readJson(path.join(SNAPSHOT_DIR, `${n}.json`), undefined)
  return {
    children: read('children'),
    team_members: read('team_members'),
    events: read('events'),
    resources: read('resources'),
    partners: read('partners'),
    pages,
  }
}

// Downloads one asset; returns the manifest entry or throws.
export async function download(url, destDir, { fetchImpl = fetchWithRetry, root = ROOT_DIR } = {}) {
  const res = await fetchImpl(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const bytes = Buffer.from(await res.arrayBuffer())
  const rel = path.join(destDir, localFileName(url))
  mkdirSync(path.join(root, destDir), { recursive: true })
  writeFileSync(path.join(root, rel), bytes)
  return {
    path: rel,
    contentType: res.headers.get('content-type') ?? undefined,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  }
}

// Runs the plan against existing manifests. Pure aside from download().
export async function harvestPlan(plan, manifests, { downloadImpl = download, root = ROOT_DIR } = {}) {
  const failures = []
  let downloaded = 0
  let skipped = 0
  for (const [url, { dir, alt, manifest }] of plan) {
    const entries = manifests[manifest]
    const existing = entries[url]
    // Skip only when the stored copy is where the current plan wants it
    // (an asset can move, e.g. from page imagery to CMS media).
    if (existing && existing.path.startsWith(`${dir}/`) && existsSync(path.join(root, existing.path))) {
      if (alt && !existing.alt) existing.alt = alt
      skipped++
      continue
    }
    try {
      entries[url] = { ...(await downloadImpl(url, dir, { root })), alt }
      downloaded++
    } catch (err) {
      failures.push({ url, reason: err.message })
    }
  }
  return { downloaded, skipped, failures }
}

// Logo, favicons, Open Graph image from the live home page <head>/navbar.
async function siteChrome() {
  const $ = load(await fetchText(`${LIVE_BASE_URL}/`))
  const pick = (sel, attr) => $(sel).first().attr(attr)
  const footerImage = (alt) => $(`.footer_component img[alt="${alt}"]`).attr('src')
  return {
    candidSeal: $('.footer_candid-row img').attr('src'),
    socialFacebook: footerImage('Facebook'),
    socialInstagram: footerImage('Instagram'),
    socialLinkedin: footerImage('LinkedIn'),
    socialYoutube: footerImage('YouTube'),
    logo: pick('img.navbar_logo', 'src'),
    footerLogo: pick('.footer_component img', 'src'),
    favicon: pick('link[rel="shortcut icon"], link[rel="icon"]', 'href'),
    appleTouchIcon: pick('link[rel="apple-touch-icon"]', 'href'),
    ogImage: pick('meta[property="og:image"]', 'content'),
  }
}

const CHROME_TARGETS = {
  candidSeal: 'images/footer/candid-seal',
  socialFacebook: 'images/footer/facebook',
  socialInstagram: 'images/footer/instagram',
  socialLinkedin: 'images/footer/linkedin',
  socialYoutube: 'images/footer/youtube',
  logo: 'images/logo',
  footerLogo: 'images/logo-footer',
  favicon: 'favicon',
  appleTouchIcon: 'apple-touch-icon',
  ogImage: 'images/og-default',
}

// Generic fact icons on child detail pages (age, birthday, gender, dream).
// Read from one child page; the icons are the same for every child.
async function childFactIcons() {
  const children = readJson(path.join(SNAPSHOT_DIR, 'children.json'), { items: [] }).items
  if (!children.length) return {}
  const $ = load(await fetchText(children[0].url))
  const icons = {}
  $('.section_child-detail img.image-24').each((_, img) => {
    const label = $(img).parent().find('h2').first().text().trim().replace(/:$/, '').toLowerCase()
    const src = $(img).attr('src')
    if (label && src) icons[`childIcon_${label}`] = src
  })
  return icons
}

async function harvestChrome(report) {
  const chrome = { ...(await siteChrome()), ...(await childFactIcons()) }
  const written = {}
  for (const [key, url] of Object.entries(chrome)) {
    if (!isWebflowAsset(url)) continue
    const ext = path.extname(new URL(url).pathname).toLowerCase() || '.png'
    const target = CHROME_TARGETS[key] ?? (key.startsWith('childIcon_') ? `images/child/${key.slice('childIcon_'.length)}` : undefined)
    if (!target) continue
    const rel = `${target}${ext}`
    const file = path.join(ROOT_DIR, 'public', rel)
    if (!existsSync(file)) {
      const res = await fetchWithRetry(url)
      if (!res.ok) {
        report.line(`- Site chrome \`${key}\` failed: HTTP ${res.status} ${url}`)
        continue
      }
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    }
    written[key] = `/${rel}`
  }
  writeFileSync(path.join(MEDIA_DIR, 'site-chrome.json'), `${JSON.stringify(written, null, 2)}\n`)
  return written
}

export async function harvest() {
  const report = createSection('Asset harvest')
  mkdirSync(MEDIA_DIR, { recursive: true })
  mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true })
  const manifests = { main: readJson(MANIFEST_PATH, {}), children: readJson(CHILD_MANIFEST_PATH, {}) }
  const plan = planAssets(readSnapshots())
  const result = await harvestPlan(plan, manifests)

  const chrome = await harvestChrome(report)
  const pruned = pruneUnreferenced(plan, manifests)
  mkdirSync(path.dirname(CHILD_MANIFEST_PATH), { recursive: true })
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(sortKeys(manifests.main), null, 2)}\n`)
  writeFileSync(CHILD_MANIFEST_PATH, `${JSON.stringify(sortKeys(manifests.children), null, 2)}\n`)

  report.line(`- Planned: ${plan.size} assets; downloaded ${result.downloaded}, already present ${result.skipped}.`)
  report.line(`- Site chrome: ${Object.keys(chrome).join(', ') || 'none'}.`)
  report.line(`- Removed ${pruned} files no longer referenced by the snapshot.`)
  if (result.failures.length) {
    report.line(`- Failed downloads (${result.failures.length}):`)
    report.list(result.failures.map((f) => `${f.reason} — ${f.url} (${referrers(f.url)})`))
  } else {
    report.line('- Failed downloads: none.')
  }
  report.write()
  return { planned: plan.size, ...result, failures: result.failures.length }
}

// Deletes downloaded files (and manifest entries) the current plan no longer
// references, e.g. an asset that moved from page imagery to CMS media.
const MANAGED_DIRS = ['public/images/pages', 'seed/media/team_members', 'seed/media/events', 'seed/media/resources', 'seed/media/sponsors', 'seed/media/children']

function pruneUnreferenced(plan, manifests) {
  const keep = new Set()
  for (const [url, entries] of [...Object.entries(manifests.main), ...Object.entries(manifests.children)].map(([u, e]) => [u, e])) {
    if (plan.has(url) && entries.path.startsWith(`${plan.get(url).dir}/`)) keep.add(entries.path)
  }
  for (const m of Object.values(manifests)) {
    for (const [url, entry] of Object.entries(m)) if (!keep.has(entry.path)) delete m[url]
  }
  let removed = 0
  for (const dir of MANAGED_DIRS) {
    const abs = path.join(ROOT_DIR, dir)
    if (!existsSync(abs)) continue
    for (const file of readdirSync(abs)) {
      const rel = `${dir}/${file}`
      if (file === 'manifest.json' || keep.has(rel)) continue
      rmSync(path.join(abs, file))
      removed++
    }
  }
  return removed
}

function referrers(url) {
  const hits = []
  for (const file of readdirSync(SNAPSHOT_DIR, { recursive: true })) {
    if (!String(file).endsWith('.json') || String(file).startsWith('children')) continue
    const text = readFileSync(path.join(SNAPSHOT_DIR, String(file)), 'utf8')
    if (text.includes(url)) hits.push(`snapshot/${file}`)
  }
  if (!hits.length && existsSync(path.join(SNAPSHOT_DIR, 'children.json'))) hits.push('a child record')
  return hits.join(', ') || 'unknown'
}

function sortKeys(obj) {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}
