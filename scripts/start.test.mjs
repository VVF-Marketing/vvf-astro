import { describe, expect, it } from 'vitest'
import { missingSettings } from './start.mjs'

describe('missingSettings', () => {
  it('requires nothing for the local SQLite + disk mode', () => {
    expect(missingSettings({})).toEqual([])
  })

  it('requires DATABASE_URL in Postgres mode', () => {
    expect(missingSettings({ DB_ADAPTER: 'postgres' })).toEqual(['DATABASE_URL'])
    expect(missingSettings({ DB_ADAPTER: 'postgres', DATABASE_URL: 'postgres://x' })).toEqual([])
  })

  it('requires the cron secret and sync token on Vercel', () => {
    expect(missingSettings({ DEPLOY_TARGET: 'vercel' })).toEqual(['CRON_SECRET', 'EMDASH_SYNC_PAT'])
    expect(missingSettings({ DEPLOY_TARGET: 'vercel', CRON_SECRET: 'c', EMDASH_SYNC_PAT: 'p' })).toEqual([])
    expect(missingSettings({ DEPLOY_TARGET: 'node' })).toEqual([])
  })

  it('requires the S3 settings in S3 mode', () => {
    expect(missingSettings({ STORAGE: 's3', S3_BUCKET: 'media' })).toEqual(['S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'])
  })
})
