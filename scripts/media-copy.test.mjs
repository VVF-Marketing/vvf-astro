import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { contentTypeFor, copyBetween, copyMedia, listKeys, parseCopyArgs } from './media-copy.mjs'

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

  it('copies storage to storage page by page, skipping what the target has', async () => {
    const files = { 'a.webp': 'A', 'reports/b.pdf': 'B', 'c.png': 'C' }
    const pages = [['a.webp', 'reports/b.pdf'], ['c.png']]
    const source = {
      list: async ({ cursor }) => ({ files: pages[cursor ?? 0].map((key) => ({ key })), nextCursor: cursor ? undefined : 1 }),
      download: async (key) => ({ body: files[key], contentType: contentTypeFor(key) }),
    }
    const target = fakeBucket(['c.png'])
    expect(await copyBetween({ source, target })).toEqual({ copied: 2, skipped: 1 })
    expect(target.objects.get('reports/b.pdf')).toEqual({ body: 'B', contentType: 'application/pdf' })
    expect(target.objects.get('c.png')).toBe('old')
  })

  it('copies from disk to $STORAGE by default, and checks --from and --to', () => {
    expect(parseCopyArgs([], { STORAGE: 'blob' })).toEqual({ from: 'local', to: 'blob' })
    expect(parseCopyArgs(['--from', 's3', '--to', 'blob'], {})).toEqual({ from: 's3', to: 'blob' })
    expect(() => parseCopyArgs([], {})).toThrow(/--to/)
    expect(() => parseCopyArgs(['--to', 'local'], {})).toThrow(/s3 or blob/)
    expect(() => parseCopyArgs(['--from', 'blob', '--to', 's3'], {})).toThrow(/--from/)
    expect(() => parseCopyArgs(['--from', 's3', '--to', 's3'], {})).toThrow(/same/)
  })
})
