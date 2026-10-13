import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Kysely, sql } from 'kysely'
import { createDialect } from 'emdash/db/sqlite'
import { createStorage } from 'emdash/storage/local'
import sharp from 'sharp'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { mediaIdFor, mediaMapFor, mediaValueFor, seedMedia, storageKeyFor } from './seed-media.mjs'

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/

let png
beforeAll(async () => {
  png = await sharp({ create: { width: 3, height: 2, channels: 3, background: '#fff' } }).png().toBuffer()
})

const files = () => ({
  'seed/media/events/a.png': png,
  'seed/media/resources/report.pdf': Buffer.from('%PDF-1.4'),
})
const manifest = {
  'https://cdn.example/a.png': { path: 'seed/media/events/a.png', contentType: 'image/png', alt: 'A' },
  'https://cdn.example/a-again.png': { path: 'seed/media/events/a.png', contentType: 'image/png', alt: 'A' },
  'https://cdn.example/report.pdf': { path: 'seed/media/resources/report.pdf', contentType: 'application/pdf' },
  'https://cdn.example/logo.svg': { path: 'seed/media/sponsors/logo.svg', contentType: 'image/svg+xml', alt: 'Logo' },
  'https://cdn.example/hero.jpg': { path: 'public/images/pages/hero.jpg', contentType: 'image/jpeg' },
}

describe('mediaIdFor / storageKeyFor', () => {
  it('is deterministic, ULID-shaped and distinct per path', () => {
    const a = mediaIdFor('seed/media/events/a.png')
    expect(a).toBe(mediaIdFor('seed/media/events/a.png'))
    expect(a).toMatch(ULID)
    expect(mediaIdFor('seed/media/events/b.png')).not.toBe(a)
  })

  it('keeps the lower-cased extension', () => {
    expect(storageKeyFor('seed/media/events/Photo.JPG')).toBe(`${mediaIdFor('seed/media/events/Photo.JPG')}.jpg`)
  })
})

describe('mediaValueFor', () => {
  const readFile = (rel) => files()[rel]

  it('builds a local value with dimensions, alt and storage key', async () => {
    const value = await mediaValueFor(manifest['https://cdn.example/a.png'], { readFile })
    expect(value).toEqual({
      provider: 'local',
      id: mediaIdFor('seed/media/events/a.png'),
      alt: 'A',
      width: 3,
      height: 2,
      mimeType: 'image/png',
      filename: 'a.png',
      meta: { storageKey: storageKeyFor('seed/media/events/a.png') },
    })
  })

  it('has no dimensions for documents', async () => {
    const value = await mediaValueFor(manifest['https://cdn.example/report.pdf'], { readFile })
    expect(value.width).toBeUndefined()
    expect(value.mimeType).toBe('application/pdf')
  })

  it('serves SVGs as static external media', async () => {
    expect(await mediaValueFor(manifest['https://cdn.example/logo.svg'], { readFile })).toEqual({
      provider: 'external',
      id: 'static-logo.svg',
      src: '/images/media/logo.svg',
      alt: 'Logo',
      mimeType: 'image/svg+xml',
      filename: 'logo.svg',
    })
  })

  it('maps only seed media', async () => {
    const map = await mediaMapFor(manifest, { readFile })
    expect(Object.keys(map)).not.toContain('https://cdn.example/hero.jpg')
    expect(map['https://cdn.example/a-again.png']).toEqual(map['https://cdn.example/a.png'])
  })
})

describe('seedMedia', () => {
  let dir
  let db
  let storage
  const readFile = (rel) => files()[rel]

  beforeEach(async () => {
    dir = mkdtempSync(path.join(tmpdir(), 'seed-media-'))
    db = new Kysely({ dialect: createDialect({ url: `file:${path.join(dir, 'data.db')}` }) })
    await sql`create table media (id text primary key, filename text not null, mime_type text not null, size integer, width integer, height integer, alt text, caption text, storage_key text not null, content_hash text, created_at text default (datetime('now')), status text default 'ready' not null)`.execute(db)
    storage = createStorage({ directory: path.join(dir, 'uploads'), baseUrl: '/_emdash/api/media/file' })
  })

  afterEach(async () => {
    await db.destroy()
    rmSync(dir, { recursive: true, force: true })
  })

  it('uploads each file once and creates its row', async () => {
    expect(await seedMedia({ db, storage, manifest, readFile })).toEqual({ uploaded: 2, skipped: 0 })
    const rows = await db.selectFrom('media').selectAll().orderBy('filename').execute()
    expect(rows.map((r) => [r.filename, r.width, r.alt])).toEqual([
      ['a.png', 3, 'A'],
      ['report.pdf', null, null],
    ])
    expect(existsSync(path.join(dir, 'uploads', storageKeyFor('seed/media/events/a.png')))).toBe(true)
  })

  it('skips existing rows on a re-run, and re-uploads with force', async () => {
    await seedMedia({ db, storage, manifest, readFile })
    const key = path.join(dir, 'uploads', storageKeyFor('seed/media/events/a.png'))
    rmSync(key)
    expect(await seedMedia({ db, storage, manifest, readFile })).toEqual({ uploaded: 0, skipped: 2 })
    expect(existsSync(key)).toBe(false)
    expect(await seedMedia({ db, storage, manifest, readFile, force: true })).toEqual({ uploaded: 2, skipped: 0 })
    expect(existsSync(key)).toBe(true)
    expect(await db.selectFrom('media').select(db.fn.countAll().as('n')).executeTakeFirst()).toEqual({ n: 2 })
  })
})
