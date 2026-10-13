import { describe, expect, it, vi } from 'vitest'
import { importMedia, toMediaValue } from './media.mjs'

const CDN = 'https://cdn.prod.website-files.com/site'

function fakeClient(existing = new Set()) {
  let n = 0
  return {
    mediaUpload: vi.fn(async (_bytes, filename) => {
      const id = `m${++n}`
      existing.add(id)
      return { id, filename, mimeType: 'image/png', width: 10, height: 20, alt: null, storageKey: `${id}.png` }
    }),
    mediaGet: vi.fn(async (id) => {
      if (!existing.has(id)) throw new Error('404')
      return { id }
    }),
    request: vi.fn(async () => ({})),
  }
}

const manifests = {
  [`${CDN}/a.png`]: { path: 'seed/media/team_members/a.png', alt: 'Ana' },
  [`${CDN}/hero.png`]: { path: 'public/images/pages/hero.png' },
}

describe('toMediaValue', () => {
  it('builds a local media value keyed by storage key', () => {
    expect(toMediaValue({ id: 'm1', filename: 'a.png', mimeType: 'image/png', width: 1, height: 2, alt: null, storageKey: 'k.png' })).toEqual({
      provider: 'local',
      id: 'm1',
      alt: undefined,
      width: 1,
      height: 2,
      mimeType: 'image/png',
      filename: 'a.png',
      meta: { storageKey: 'k.png' },
    })
  })
})

describe('importMedia', () => {
  it('uploads CMS media only, sets alt text, and records media values', async () => {
    const client = fakeClient()
    let saved
    const result = await importMedia({ client, manifests, map: {}, readFile: () => Buffer.from('x'), save: (m) => (saved = m) })
    expect(result).toEqual({ uploaded: 1, skipped: 0, staticFiles: 0, failures: [] })
    expect(client.request).toHaveBeenCalledWith('PUT', '/media/m1', { alt: 'Ana' })
    expect(saved[`${CDN}/a.png`]).toMatchObject({ id: 'm1', alt: 'Ana', meta: { storageKey: 'm1.png' } })
    expect(saved[`${CDN}/hero.png`]).toBeUndefined()
  })

  it('uploads nothing on a re-run against the same database', async () => {
    const existing = new Set()
    const client = fakeClient(existing)
    const map = {}
    const opts = { client, manifests, map, readFile: () => Buffer.from('x'), save: () => {} }
    await importMedia(opts)
    const second = await importMedia(opts)
    expect(second).toEqual({ uploaded: 0, skipped: 1, staticFiles: 0, failures: [] })
    expect(client.mediaUpload).toHaveBeenCalledTimes(1)
  })

  it('serves SVGs statically as external media instead of uploading', async () => {
    const client = fakeClient()
    const copied = []
    let saved
    const result = await importMedia({
      client,
      manifests: { [`${CDN}/logo.svg`]: { path: 'seed/media/events/abc-logo.svg', alt: 'Logo' } },
      map: {},
      readFile: () => Buffer.from('x'),
      copyStatic: (rel) => copied.push(rel),
      save: (m) => (saved = m),
    })
    expect(result.staticFiles).toBe(1)
    expect(client.mediaUpload).not.toHaveBeenCalled()
    expect(copied).toEqual(['seed/media/events/abc-logo.svg'])
    expect(saved[`${CDN}/logo.svg`]).toMatchObject({ provider: 'external', src: '/images/media/abc-logo.svg', alt: 'Logo' })
  })

  it('re-uploads when the recorded media item no longer exists (fresh database)', async () => {
    const client = fakeClient()
    const map = { [`${CDN}/a.png`]: { id: 'gone' } }
    const result = await importMedia({ client, manifests, map, readFile: () => Buffer.from('x'), save: () => {} })
    expect(result.uploaded).toBe(1)
  })
})
