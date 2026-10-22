import { describe, expect, it } from 'vitest'
import { openStorageKind, storageLabel } from './storage.mjs'

describe('openStorageKind', () => {
  it('opens Blob with the token from the given env', () => {
    expect(openStorageKind('blob', { env: { BLOB_READ_WRITE_TOKEN: 'vercel_blob_rw_x' } }).token).toBe('vercel_blob_rw_x')
    expect(() => openStorageKind('blob', { env: {} })).toThrow(/BLOB_READ_WRITE_TOKEN/)
  })

  it('needs a directory for local storage, and refuses unknown kinds', () => {
    expect(openStorageKind('local', { dir: '/tmp/vvf-uploads' })).toBeDefined()
    expect(() => openStorageKind('local')).toThrow(/directory/)
    expect(() => openStorageKind('gcs')).toThrow(/local, s3, blob/)
  })

  it('labels storage without secrets', () => {
    expect(storageLabel('blob', { env: { BLOB_READ_WRITE_TOKEN: 'secret' } })).toBe('Vercel Blob')
    expect(storageLabel('s3', { env: { S3_BUCKET: 'media', S3_SECRET_ACCESS_KEY: 'secret' } })).toBe('S3 media')
    expect(storageLabel('local', { dir: '/x/uploads' })).toBe('disk /x/uploads')
  })
})
