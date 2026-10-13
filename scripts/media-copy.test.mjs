import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contentTypeFor, copyMedia, listKeys } from './media-copy.mjs'

function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 'vvf-media-'))
  mkdirSync(path.join(dir, 'reports'))
  writeFileSync(path.join(dir, 'a.webp'), 'A')
  writeFileSync(path.join(dir, 'reports', 'b.pdf'), 'B')
  writeFileSync(path.join(dir, '.DS_Store'), 'x')
  return dir
}

function fakeBucket(existing = []) {
  const objects = new Map(existing.map((k) => [k, 'old']))
  return { objects, exists: async (k) => objects.has(k), upload: async ({ key, body, contentType }) => void objects.set(key, { body: String(body), contentType }) }
}

describe('media copy', () => {
  it('lists files by storage key, ignoring dotfiles', () => {
    expect(listKeys(fixture())).toEqual(['a.webp', 'reports/b.pdf'])
  })

  it('copies every file under the same key with its content type', async () => {
    const bucket = fakeBucket()
    const result = await copyMedia({ sourceDir: fixture(), target: bucket })
    expect(result).toEqual({ copied: 2, skipped: 0 })
    expect(bucket.objects.get('reports/b.pdf')).toEqual({ body: 'B', contentType: 'application/pdf' })
  })

  it('skips files already in the bucket, so a re-run copies nothing', async () => {
    const bucket = fakeBucket(['a.webp'])
    expect(await copyMedia({ sourceDir: fixture(), target: bucket })).toEqual({ copied: 1, skipped: 1 })
    expect(bucket.objects.get('a.webp')).toBe('old')
  })

  it('knows common media types', () => {
    expect(contentTypeFor('x/IMG.JPG')).toBe('image/jpeg')
    expect(contentTypeFor('y.unknown')).toBe('application/octet-stream')
  })
})
