// Seed media with stable values (openspec/changes/seed-postgres-with-media).
//
// Every seeded media file gets an ID and storage key derived from its
// repo-relative path (D1), so the media values written into seed/seed.json
// are the same in every database. seedMedia() puts the files into the
// configured storage under those keys and creates their media rows; it's
// shared by `npm run seed` (SQLite + disk) and `npm run db:setup`
// (Postgres + S3).
//
// The public manifest (seed/media/manifest.json, committed) is the only input
// for the public seed. The child manifest lives under the gitignored
// seed/media/children/ and is only read when present locally.
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
export const PUBLIC_MANIFEST_PATH = path.join(ROOT_DIR, 'seed/media/manifest.json')
export const CHILD_MANIFEST_PATH = path.join(ROOT_DIR, 'seed/media/children/manifest.json')

// SVGs (sponsor logos) can't go in EmDash's media library; they're committed
// under public/images/media and referenced as external media.
const STATIC_MEDIA_URL = '/images/media'

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

function readJson(file) {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
}

export function readManifests({ children = true } = {}) {
  const pub = readJson(PUBLIC_MANIFEST_PATH)
  return { public: pub, all: children ? { ...pub, ...readJson(CHILD_MANIFEST_PATH) } : pub }
}

export function isSvg(entry) {
  return Boolean(entry.contentType?.includes('svg') || entry.path.toLowerCase().endsWith('.svg'))
}

// Only CMS media (seed/media/**) is seeded; page imagery is served from public/.
export const isSeedMedia = (entry) => entry.path.startsWith('seed/media/')

// 26 characters in the ULID alphabet, from the SHA-256 of the path. The first
// character stays at 7 or below so every ID is also a valid ULID.
export function mediaIdFor(relPath) {
  const hash = createHash('sha256').update(relPath).digest()
  let bits = 0n
  for (const byte of hash.subarray(0, 17)) bits = (bits << 8n) | BigInt(byte)
  let id = ''
  for (let i = 0; i < 26; i++) {
    id = CROCKFORD[Number(bits & 31n)] + id
    bits >>= 5n
  }
  return CROCKFORD[CROCKFORD.indexOf(id[0]) & 7] + id.slice(1)
}

export function storageKeyFor(relPath) {
  return `${mediaIdFor(relPath)}${path.extname(relPath).toLowerCase()}`
}

async function dimensions(entry, readFile) {
  if (!entry.contentType?.startsWith('image/')) return {}
  try {
    const { width, height } = await sharp(readFile(entry.path)).metadata()
    return { width, height }
  } catch {
    return {}
  }
}

// The value an image/file field stores for a manifest entry.
export async function mediaValueFor(entry, { readFile = (rel) => readFileSync(path.join(ROOT_DIR, rel)) } = {}) {
  const filename = path.basename(entry.path)
  if (isSvg(entry)) {
    return { provider: 'external', id: `static-${filename}`, src: `${STATIC_MEDIA_URL}/${filename}`, alt: entry.alt, mimeType: 'image/svg+xml', filename }
  }
  return {
    provider: 'local',
    id: mediaIdFor(entry.path),
    alt: entry.alt ?? undefined,
    ...(await dimensions(entry, readFile)),
    mimeType: entry.contentType,
    filename,
    meta: { storageKey: storageKeyFor(entry.path) },
  }
}

// Source URL → media value, for transform.mjs.
export async function mediaMapFor(manifest, options) {
  const map = {}
  for (const [url, entry] of Object.entries(manifest)) {
    if (isSeedMedia(entry)) map[url] = await mediaValueFor(entry, options)
  }
  return map
}

// Upload each seed media file to `storage` and create its media row. Rows
// that already exist are skipped (with `force`, their files are uploaded
// again). Files go up before rows, so a crash never leaves a row pointing at
// a missing file; re-running fills in what's missing.
export async function seedMedia({ db, storage, manifest, force = false, readFile = (rel) => readFileSync(path.join(ROOT_DIR, rel)) }) {
  const counts = { uploaded: 0, skipped: 0 }
  const seen = new Set()
  for (const entry of Object.values(manifest)) {
    if (!isSeedMedia(entry) || isSvg(entry) || seen.has(entry.path)) continue
    seen.add(entry.path)
    const value = await mediaValueFor(entry, { readFile })
    const existing = await db.selectFrom('media').select('id').where('id', '=', value.id).executeTakeFirst()
    if (existing && !force) {
      counts.skipped++
      continue
    }
    const body = readFile(entry.path)
    await storage.upload({ key: value.meta.storageKey, body: new Uint8Array(body), contentType: entry.contentType })
    if (!existing) {
      await db
        .insertInto('media')
        .values({
          id: value.id,
          filename: value.filename,
          mime_type: entry.contentType,
          size: body.length,
          width: value.width ?? null,
          height: value.height ?? null,
          alt: entry.alt ?? null,
          storage_key: value.meta.storageKey,
          content_hash: createHash('sha256').update(body).digest('hex'),
          status: 'ready',
        })
        .execute()
    }
    counts.uploaded++
  }
  return counts
}
