// Mapping of EmDash's storage interface onto Vercel Blob, with the SDK mocked
// (store-media-in-vercel-blob, design D6). The live round trip is a separate,
// token-gated CI step.
import { describe, expect, it, vi } from 'vitest'
import { BlobNotFoundError } from '@vercel/blob'
import { VercelBlobStorage, createStorage, UPLOAD_ORIGIN } from './vercelBlob.mjs'

const TOKEN = 'vercel_blob_rw_test'

function storage(overrides: Record<string, unknown> = {}) {
  // Loosely typed: each test swaps in the SDK calls it needs.
  const sdk: any = {
    put: vi.fn(async (pathname: string, _body?: unknown, _options?: unknown) => ({ pathname })),
    get: vi.fn(),
    head: vi.fn(async () => ({})),
    del: vi.fn(async () => {}),
    list: vi.fn(),
    issueSignedToken: vi.fn(async () => ({ delegationToken: 'd', clientSigningToken: 'c', validUntil: 0 })),
    presignUrl: vi.fn(async () => ({ presignedUrl: 'https://vercel.com/api/blob/?pathname=media%2F01A.png&vercel-blob-signature=s' })),
    ...overrides,
  }
  return { s: new VercelBlobStorage({ token: TOKEN, sdk }), sdk }
}

const notFound = () => Object.assign(new BlobNotFoundError(), { name: 'BlobNotFoundError' })

describe('VercelBlobStorage', () => {
  it('uploads privately, under the exact key, overwriting', async () => {
    const { s, sdk } = storage()
    const result = await s.upload({ key: 'media/01A.png', body: new Uint8Array([1, 2, 3]), contentType: 'image/png', cacheControl: 'public, max-age=31536000, immutable' })
    expect(result).toEqual({ key: 'media/01A.png', url: '/_emdash/api/media/file/media/01A.png', size: 3 })
    const [key, , options] = sdk.put.mock.calls[0]
    expect(key).toBe('media/01A.png')
    expect(options).toMatchObject({ access: 'private', token: TOKEN, contentType: 'image/png', addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 31536000 })
  })

  it('reads a stream body before uploading', async () => {
    const { s, sdk } = storage()
    const body = new Response('hello').body!
    expect((await s.upload({ key: 'a.txt', body, contentType: 'text/plain' })).size).toBe(5)
    expect(sdk.put.mock.calls[0][2]).not.toHaveProperty('cacheControlMaxAge')
  })

  it('never uploads with public access, whatever it is asked to store', async () => {
    const { s, sdk } = storage()
    for (const key of ['media/child.jpg', 'backups/2026/site.json', 'report.pdf']) await s.upload({ key, body: new Uint8Array(1), contentType: 'application/octet-stream' })
    await s.getSignedUploadUrl({ key: 'media/01B.png', contentType: 'image/png' })
    for (const [, , options] of sdk.put.mock.calls) expect(options.access).toBe('private')
    for (const [, options] of sdk.presignUrl.mock.calls) expect(options.access).toBe('private')
  })

  it('downloads the stream with its type and size', async () => {
    const stream = new Response('x').body
    const { s } = storage({ get: vi.fn(async () => ({ statusCode: 200, stream, blob: { contentType: 'application/pdf', size: 20 } })) })
    expect(await s.download('report.pdf')).toEqual({ body: stream, contentType: 'application/pdf', size: 20 })
  })

  it('reports a missing file as "not found", which the media route answers with 404', async () => {
    for (const get of [vi.fn(async () => null), vi.fn(async () => { throw notFound() })]) {
      const { s } = storage({ get })
      await expect(s.download('missing.png')).rejects.toMatchObject({ code: 'NOT_FOUND', message: expect.stringContaining('not found') })
    }
    const { s } = storage({ get: vi.fn(async () => { throw new Error('network') }) })
    await expect(s.download('a.png')).rejects.toMatchObject({ code: 'DOWNLOAD_FAILED' })
  })

  it('checks existence with head, and ignores deleting a missing file', async () => {
    expect(await storage().s.exists('a.png')).toBe(true)
    expect(await storage({ head: vi.fn(async () => { throw notFound() }) }).s.exists('a.png')).toBe(false)
    await expect(storage({ head: vi.fn(async () => { throw new Error('down') }) }).s.exists('a.png')).rejects.toMatchObject({ code: 'HEAD_FAILED' })
    await expect(storage({ del: vi.fn(async () => { throw notFound() }) }).s.delete('a.png')).resolves.toBeUndefined()
    await expect(storage({ del: vi.fn(async () => { throw new Error('down') }) }).s.delete('a.png')).rejects.toMatchObject({ code: 'DELETE_FAILED' })
  })

  it('lists by prefix and pages with the cursor', async () => {
    const uploadedAt = '2026-10-22T00:00:00.000Z'
    const list = vi
      .fn()
      .mockResolvedValueOnce({ blobs: [{ pathname: 'media/01A.png', size: 3, uploadedAt, etag: 'e1' }], hasMore: true, cursor: 'c1' })
      .mockResolvedValueOnce({ blobs: [{ pathname: 'media/01B.png', size: 4, uploadedAt, etag: 'e2' }], hasMore: false, cursor: undefined })
    const { s } = storage({ list })
    const first = await s.list({ prefix: 'media/', limit: 1 })
    expect(first).toEqual({ files: [{ key: 'media/01A.png', size: 3, lastModified: new Date(uploadedAt), etag: 'e1' }], nextCursor: 'c1' })
    const second = await s.list({ prefix: 'media/', limit: 1, cursor: first.nextCursor })
    expect(second.nextCursor).toBeUndefined()
    expect(list.mock.calls[1][0]).toMatchObject({ prefix: 'media/', limit: 1, cursor: 'c1', token: TOKEN })
  })

  it('signs a single-use direct upload scoped to the key, type and size, without a random suffix', async () => {
    const { s, sdk } = storage()
    const before = Date.now()
    const signed = await s.getSignedUploadUrl({ key: 'media/01B.pdf', contentType: 'application/pdf', size: 20_000_000 })
    expect(signed).toMatchObject({ url: expect.stringMatching(/^https:\/\/vercel\.com\//), method: 'PUT', headers: { 'x-content-type': 'application/pdf' } })
    const tokenOptions = sdk.issueSignedToken.mock.calls[0][0]
    expect(tokenOptions).toMatchObject({ pathname: 'media/01B.pdf', operations: ['put'], allowedContentTypes: ['application/pdf'], maximumSizeInBytes: 20_000_000, token: TOKEN })
    expect(tokenOptions.validUntil - before).toBeGreaterThanOrEqual(600_000)
    expect(tokenOptions.validUntil - before).toBeLessThan(601_000)
    expect(sdk.presignUrl.mock.calls[0][1]).toMatchObject({ operation: 'put', pathname: 'media/01B.pdf', addRandomSuffix: false, allowOverwrite: false })
    expect(new Date(signed.expiresAt).getTime()).toBe(tokenOptions.validUntil)
  })

  it('serves through the media route and allows the upload origin', () => {
    const { s } = storage()
    expect(s.getPublicUrl('media/01A.png')).toBe('/_emdash/api/media/file/media/01A.png')
    expect(s.getClientUploadOrigin()).toBe(UPLOAD_ORIGIN)
  })
})

describe('createStorage', () => {
  it('reads the token from the environment, not from config', () => {
    expect(createStorage({}, { BLOB_READ_WRITE_TOKEN: TOKEN }).token).toBe(TOKEN)
    expect(() => createStorage({}, {})).toThrow(/BLOB_READ_WRITE_TOKEN/)
  })
})
