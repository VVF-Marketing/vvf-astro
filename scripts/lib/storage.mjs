// The storage kinds the scripts read and write, opened the same way the site
// opens them, so keys match what the site stores: local disk, an
// S3-compatible bucket (S3_*), or a private Vercel Blob store
// (BLOB_READ_WRITE_TOKEN; store-media-in-vercel-blob, D5).
import { createStorage as createLocalStorage } from 'emdash/storage/local'
import { createStorage as createS3Storage } from 'emdash/storage/s3'
import { createStorage as createBlobStorage } from '../../src/lib/storage/vercelBlob.mjs'

export const STORAGE_KINDS = ['local', 's3', 'blob']

export function openStorageKind(kind, { dir, env = process.env } = {}) {
  if (kind === 's3') return createS3Storage({})
  if (kind === 'blob') return createBlobStorage({}, env)
  if (kind === 'local') {
    if (!dir) throw new Error('Local storage needs a directory.')
    return createLocalStorage({ directory: dir, baseUrl: '/_emdash/api/media/file' })
  }
  throw new Error(`Unknown storage "${kind}": use ${STORAGE_KINDS.join(', ')}.`)
}

// For messages: where the files are, without any secret.
export function storageLabel(kind, { dir, env = process.env } = {}) {
  if (kind === 's3') return `S3 ${env.S3_BUCKET}`
  if (kind === 'blob') return 'Vercel Blob'
  return `disk ${dir}`
}
