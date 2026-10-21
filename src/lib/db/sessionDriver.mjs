// Astro session driver for deployed (Postgres) mode: admin sign-ins live in
// the site's Postgres database (table astro_sessions), not on the
// container's disk, so any instance can serve any signed-in editor and
// nothing is lost when a container is replaced
// (openspec/changes/make-app-portable, design D4). Connects with DATABASE_URL
// at runtime; local SQLite builds keep Astro's default filesystem sessions.
import { createDatabase } from 'db0'
import postgresql from 'db0/connectors/postgresql'
import db0Driver from 'unstorage/drivers/db0'
import { createPool, poolConfig } from './postgresRuntime.mjs'

// db0's connector opens one pg.Client and keeps it forever, so a connection
// dropped while a Vercel instance is frozen would break sign-ins until the
// instance is recycled. Its `lib` option takes the place of the pg module:
// hand it a "Client" that runs every query on a small pool, which reconnects
// and closes idle clients (run-on-vercel-functions, D6).
export function pooledClientLib(pool) {
  return {
    Client: class {
      async connect() {}
      query(text, params) {
        return pool.query(text, params)
      }
      end() {
        return pool.end()
      }
    },
  }
}

export default function sessionDriver(config = {}) {
  const pool = createPool(poolConfig(process.env, { max: 2 }))
  const database = createDatabase(postgresql({ url: 'pooled', lib: pooledClientLib(pool) }))
  return db0Driver({ database, tableName: config.tableName ?? 'astro_sessions' })
}
