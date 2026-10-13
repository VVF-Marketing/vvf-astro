// Step 3: harvested files → EmDash media library (design D4).
//
// Uploads every file in the harvest manifests to a running local EmDash
// (dev-bypass auth, localhost only), sets alt text, and records
// source URL → EmDash media value in seed/media/emdash-media.local.json.
// That map is database-specific and gitignored; transform.mjs reads it to
// fill image fields. Entries whose media item still exists are skipped.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { EmDashClient } from 'emdash/client'
import { MANIFEST_PATH, MEDIA_DIR, ROOT_DIR } from './lib/paths.mjs'
import { createSection } from './lib/report.mjs'

export const MEDIA_MAP_PATH = path.join(MEDIA_DIR, 'emdash-media.local.json')
const CHILD_MANIFEST_PATH = path.join(MEDIA_DIR, 'children/manifest.json')

// EmDash's media library rejects SVG uploads, so SVGs (sponsor logos) are
// served as static files and referenced as external media.
const STATIC_MEDIA_DIR = 'public/images/media'

export function isSvg(entry) {
  return entry.contentType?.includes('svg') || entry.path.toLowerCase().endsWith('.svg')
}

function readJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
}

// EmDash media item → value stored in an image/file field.
export function toMediaValue(item) {
  return {
    provider: 'local',
    id: item.id,
    alt: item.alt ?? undefined,
    width: item.width ?? undefined,
    height: item.height ?? undefined,
    mimeType: item.mimeType,
    filename: item.filename,
    meta: { storageKey: item.storageKey },
  }
}

async function exists(client, id) {
  try {
    await client.mediaGet(id)
    return true
  } catch {
    return false
  }
}

export async function importMedia({
  baseUrl = process.env.EMDASH_URL ?? 'http://localhost:4321',
  client = new EmDashClient({ baseUrl, devBypass: true }),
  manifests = { ...readJson(MANIFEST_PATH), ...readJson(CHILD_MANIFEST_PATH) },
  map = readJson(MEDIA_MAP_PATH),
  readFile = (rel) => readFileSync(path.join(ROOT_DIR, rel)),
  copyStatic = (rel) => {
    const dest = path.join(ROOT_DIR, STATIC_MEDIA_DIR, path.basename(rel))
    mkdirSync(path.dirname(dest), { recursive: true })
    copyFileSync(path.join(ROOT_DIR, rel), dest)
  },
  save = (next) => writeFileSync(MEDIA_MAP_PATH, `${JSON.stringify(next, null, 2)}\n`),
} = {}) {
  let uploaded = 0
  let skipped = 0
  let staticFiles = 0
  const failures = []
  for (const [url, entry] of Object.entries(manifests)) {
    // Only CMS media is imported; page imagery is served from public/.
    if (!entry.path.startsWith('seed/media/')) continue
    if (isSvg(entry)) {
      copyStatic(entry.path)
      map[url] = {
        provider: 'external',
        id: `static-${path.basename(entry.path)}`,
        src: `/${STATIC_MEDIA_DIR.replace(/^public\//, '')}/${path.basename(entry.path)}`,
        alt: entry.alt,
        mimeType: 'image/svg+xml',
        filename: path.basename(entry.path),
      }
      staticFiles++
      continue
    }
    if (map[url] && (await exists(client, map[url].id))) {
      skipped++
      continue
    }
    try {
      let item = await client.mediaUpload(readFile(entry.path), path.basename(entry.path), {
        contentType: entry.contentType,
      })
      if (entry.alt && item.alt !== entry.alt) {
        await client.request('PUT', `/media/${encodeURIComponent(item.id)}`, { alt: entry.alt })
        item = { ...item, alt: entry.alt }
      }
      map[url] = toMediaValue(item)
      uploaded++
    } catch (err) {
      failures.push({ url, reason: err instanceof Error ? err.message : String(err) })
    }
  }
  save(map)
  return { uploaded, skipped, staticFiles, failures }
}

export async function media() {
  const report = createSection('Media import')
  const result = await importMedia()
  report.line(`- Uploaded ${result.uploaded}, already in EmDash ${result.skipped}.`)
  report.line(`- SVGs served from \`public/images/media/\` (EmDash rejects SVG uploads): ${result.staticFiles}.`)
  if (result.failures.length) {
    report.line(`- Failed uploads (${result.failures.length}):`)
    report.list(result.failures.map((f) => `${f.reason} — ${f.url}`))
  } else {
    report.line('- Failed uploads: none.')
  }
  report.write()
  return { ...result, failures: result.failures.length }
}
