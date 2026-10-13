// EmDash Postgres dialect that reads its connection at server start, not at
// build: EmDash serializes the database config into the build, so a
// connection string passed to `postgres({ ... })` in astro.config.mjs would be
// baked into the image. Registered as the database entrypoint in
// astro.config.mjs when DB_ADAPTER=postgres
// (openspec/changes/make-app-portable, design D0/D2).
import { createDialect as createPostgresDialect } from 'emdash/db/postgres'

export function databaseUrl(env = process.env) {
  const url = env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set: the Postgres build needs it at runtime.')
  return url
}

export function createDialect(config = {}) {
  return createPostgresDialect({
    ...config,
    connectionString: databaseUrl(),
    ssl: process.env.DATABASE_SSL === 'true' ? true : config.ssl,
  })
}
