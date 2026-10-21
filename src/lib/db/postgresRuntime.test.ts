import { describe, expect, it } from 'vitest'
import { databaseUrl, directDatabaseUrl, poolConfig } from './postgresRuntime.mjs'

describe('database URLs', () => {
  it('uses DATABASE_URL at runtime, and names it when missing', () => {
    expect(databaseUrl({ DATABASE_URL: 'postgres://pooled' })).toBe('postgres://pooled')
    expect(() => databaseUrl({})).toThrow(/DATABASE_URL/)
  })

  it('prefers the direct URL for migrations and imports', () => {
    expect(directDatabaseUrl({ DATABASE_URL: 'postgres://pooled', DATABASE_URL_UNPOOLED: 'postgres://direct' })).toBe('postgres://direct')
    expect(directDatabaseUrl({ DATABASE_URL_UNPOOLED: 'postgres://direct' })).toBe('postgres://direct')
    expect(directDatabaseUrl({ DATABASE_URL: 'postgres://pooled' })).toBe('postgres://pooled')
  })
})

describe('poolConfig', () => {
  const env = { DATABASE_URL: 'postgres://pooled' }

  it('keeps few connections per instance, closing idle ones', () => {
    expect(poolConfig(env)).toEqual({ connectionString: 'postgres://pooled', ssl: undefined, max: 5, idleTimeoutMillis: 10_000 })
  })

  it('takes DATABASE_POOL_MAX, a per-pool max and DATABASE_SSL', () => {
    expect(poolConfig({ ...env, DATABASE_POOL_MAX: '3' }).max).toBe(3)
    expect(poolConfig({ ...env, DATABASE_POOL_MAX: 'lots' }).max).toBe(5)
    expect(poolConfig(env, { max: 2 }).max).toBe(2)
    expect(poolConfig({ ...env, DATABASE_SSL: 'true' }).ssl).toBe(true)
  })

  it('connects where told, without needing DATABASE_URL', () => {
    expect(poolConfig({}, { connectionString: 'postgres://direct' }).connectionString).toBe('postgres://direct')
  })
})
