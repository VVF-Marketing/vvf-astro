// EmDash storage adapter for Vercel Blob (openspec/changes/store-media-in-vercel-blob,
// design D1/D2/D4). Registered as the storage entrypoint in astro.config.mjs
// when STORAGE=blob.
//
// One private store holds everything, backups and child photos included
// (D2): nothing is ever uploaded with public access, and visitors only reach
// files through the site's media route, which refuses backups/. The token is
// read at runtime, never passed in the descriptor, because EmDash serializes
// descriptor config into the build.
//
// Keys are EmDash's keys exactly: no random suffix, and overwrites allowed.
// Blob appends a suffix by default, which would break the key EmDash stored
// (spike D0.2/D0.4).
import { del, get, head, issueSignedToken, list, presignUrl, put, BlobNotFoundError } from '@vercel/blob'
import { EmDashStorageError } from 'emdash'

const ACCESS = 'private'
// Where the admin PUTs direct uploads (presigned URLs are on vercel.com); the
// admin's CSP allows it through getClientUploadOrigin.
export const UPLOAD_ORIGIN = 'https://vercel.com'
const DEFAULT_UPLOAD_SECONDS = 600

export function blobToken(env = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN
  if (!token) throw new EmDashStorageError('BLOB_READ_WRITE_TOKEN is not set: STORAGE=blob needs it at runtime.', 'MISSING_BLOB_CONFIG')
  return token
}

const isNotFound = (error) => error instanceof BlobNotFoundError || error?.name === 'BlobNotFoundError'

async function readAll(body) {
  if (!(body instanceof ReadableStream)) return body
  return new Uint8Array(await new Response(body).arrayBuffer())
}

export class VercelBlobStorage {
  /** @param {{ token?: string, sdk?: any }} [options] */
  constructor({ token, sdk = { del, get, head, issueSignedToken, list, presignUrl, put } } = {}) {
    this.token = token
    this.sdk = sdk
  }

  /** @param {{ key: string, body: Uint8Array | ReadableStream<Uint8Array>, contentType: string, cacheControl?: string }} options */
  async upload({ key, body, contentType, cacheControl }) {
    try {
      const bytes = await readAll(body)
      await this.sdk.put(key, bytes, {
        access: ACCESS,
        token: this.token,
        contentType,
        addRandomSuffix: false,
        allowOverwrite: true,
        ...maxAge(cacheControl),
      })
      return { key, url: this.getPublicUrl(key), size: bytes.byteLength ?? bytes.length }
    } catch (error) {
      throw new EmDashStorageError(`Failed to upload file: ${key}`, 'UPLOAD_FAILED', error)
    }
  }

  async download(key) {
    let result
    try {
      result = await this.sdk.get(key, { access: ACCESS, token: this.token })
    } catch (error) {
      if (isNotFound(error)) throw new EmDashStorageError(`File not found: ${key}`, 'NOT_FOUND', error)
      throw new EmDashStorageError(`Failed to download file: ${key}`, 'DOWNLOAD_FAILED', error)
    }
    // The media route turns "not found" into a 404.
    if (!result || result.statusCode !== 200) throw new EmDashStorageError(`File not found: ${key}`, 'NOT_FOUND')
    return {
      body: result.stream,
      contentType: result.blob.contentType || 'application/octet-stream',
      size: result.blob.size || 0,
    }
  }

  async delete(key) {
    try {
      await this.sdk.del(key, { token: this.token })
    } catch (error) {
      if (!isNotFound(error)) throw new EmDashStorageError(`Failed to delete file: ${key}`, 'DELETE_FAILED', error)
    }
  }

  async exists(key) {
    try {
      await this.sdk.head(key, { token: this.token })
      return true
    } catch (error) {
      if (isNotFound(error)) return false
      throw new EmDashStorageError(`Failed to check file existence: ${key}`, 'HEAD_FAILED', error)
    }
  }

  /** @param {{ prefix?: string, limit?: number, cursor?: string }} [options] */
  async list({ prefix, limit, cursor } = {}) {
    try {
      const page = await this.sdk.list({ prefix, limit, cursor, token: this.token })
      return {
        files: page.blobs.map((b) => ({ key: b.pathname, size: b.size, lastModified: new Date(b.uploadedAt), etag: b.etag })),
        nextCursor: page.hasMore ? page.cursor : undefined,
      }
    } catch (error) {
      throw new EmDashStorageError('Failed to list files', 'LIST_FAILED', error)
    }
  }

  // Direct uploads (D4): a presigned PUT scoped to this key, its content type
  // and size, for 10 minutes. Blob enforces each limit; it takes the stored
  // type from x-content-type (not Content-Type), so that's the header sent.
  // No overwrite: EmDash gives each upload a new key, so the link works once
  // and can't replace the file after the admin has confirmed it.
  /** @param {{ key: string, contentType: string, size?: number, expiresIn?: number }} options */
  async getSignedUploadUrl({ key, contentType, size, expiresIn }) {
    try {
      const validUntil = Date.now() + (expiresIn || DEFAULT_UPLOAD_SECONDS) * 1000
      const limits = { pathname: key, allowedContentTypes: [contentType], validUntil, ...(size ? { maximumSizeInBytes: size } : {}) }
      const signed = await this.sdk.issueSignedToken({ ...limits, operations: ['put'], token: this.token })
      const { presignedUrl } = await this.sdk.presignUrl(signed, { ...limits, access: ACCESS, operation: 'put', addRandomSuffix: false, allowOverwrite: false })
      return { url: presignedUrl, method: 'PUT', headers: { 'x-content-type': contentType }, expiresAt: new Date(validUntil).toISOString() }
    } catch (error) {
      throw new EmDashStorageError(`Failed to generate signed URL for: ${key}`, 'SIGNED_URL_FAILED', error)
    }
  }

  // Same URL as the local adapter: files are only ever read through the
  // site's media route, never from Blob directly.
  getPublicUrl(key) {
    return `/_emdash/api/media/file/${key}`
  }

  getClientUploadOrigin() {
    return UPLOAD_ORIGIN
  }
}

// `cacheControl` is a header value; Blob takes only a max-age, in seconds.
function maxAge(cacheControl) {
  const seconds = Number(/max-age=(\d+)/.exec(cacheControl ?? '')?.[1])
  return Number.isFinite(seconds) ? { cacheControlMaxAge: seconds } : {}
}

// Called by EmDash at runtime with the descriptor's (empty) config; scripts
// pass their own env.
export function createStorage(_config = {}, env = process.env) {
  return new VercelBlobStorage({ token: blobToken(env) })
}
