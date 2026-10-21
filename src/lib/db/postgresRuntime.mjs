// EmDash Postgres dialect that reads its connection at server start, not at
// build: EmDash serializes the database config into the build, so a
// connection string passed to `postgres({ ... })` in astro.config.mjs would be
// baked into the image. Registered as the database entrypoint in
// astro.config.mjs when DB_ADAPTER=postgres
// (openspec/changes/make-app-portable, design D0/D2).
//
// On functions (run-on-vercel-functions, D6): the site makes its own small
// pool (EmDash's createDialect doesn't expose it) so idle clients close, and
// on Vercel the pool is attached to Fluid compute, which releases it before an
// instance is frozen. Same dialect as EmDash's: its fail-fast migration lock.
import pg from 'pg'
import { attachDatabasePool } from '@vercel/functions'
import { FailFastPostgresDialect } from 'emdash/database/pg-migration-lock'

// The runtime connection: Neon's pooled URL on Vercel.
export function databaseUrl(env = process.env) {
  const url = env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set: the Postgres build needs it at runtime.')
  return url
}

// Migrations, setup and imports: a direct connection (Neon's pooler runs in
// transaction mode, which breaks session-level locks and settings).
export function directDatabaseUrl(env = process.env) {
  return env.DATABASE_URL_UNPOOLED || databaseUrl(env)
}

// Each instance keeps few connections; the database's pooler takes the rest.
export function poolConfig(env = process.env, { max, connectionString } = {}) {
  return {
    connectionString: connectionString ?? databaseUrl(env),
    ssl: env.DATABASE_SSL === 'true' ? true : undefined,
    max: max ?? (Number(env.DATABASE_POOL_MAX) || 5),
    idleTimeoutMillis: 10_000,
  }
}

// Logs the error code only: pg's messages can carry connection details.
function logPoolError(error) {
  const code = typeof error?.code === 'string' && /^[A-Za-z0-9_-]{1,32}$/.test(error.code) ? ` (${error.code})` : ''
  console.error(`[db] PostgreSQL idle client error${code}`)
}

export function createPool(config) {
  const pool = new pg.Pool(config)
  pool.on('error', logPoolError)
  if (process.env.VERCEL) attachDatabasePool(pool)
  return pool
}

export function createDialect(config = {}) {
  const options = poolConfig(process.env, { max: config.pool?.max })
  return new FailFastPostgresDialect({ pool: createPool({ ...options, ssl: options.ssl ?? config.ssl }) })
}

// For scripts that migrate or write in bulk (db:setup, data:import).
export function createDirectDialect() {
  return new FailFastPostgresDialect({ pool: createPool(poolConfig(process.env, { connectionString: directDatabaseUrl() })) })
}
