// Astro session driver for deployed (Postgres) mode: admin sign-ins live in
// the site's Postgres database (table astro_sessions), not on the
// container's disk, so any instance can serve any signed-in editor and
// nothing is lost when a container is replaced
// (openspec/changes/make-app-portable, design D4). Connects with DATABASE_URL
// at runtime; local SQLite builds keep Astro's default filesystem sessions.
import { createDatabase } from 'db0'
import postgresql from 'db0/connectors/postgresql'
import db0Driver from 'unstorage/drivers/db0'
import { databaseUrl } from './postgresRuntime.mjs'

export default function sessionDriver(config = {}) {
  const database = createDatabase(
    postgresql({ connectionString: databaseUrl(), ssl: process.env.DATABASE_SSL === 'true' ? true : undefined })
  )
  return db0Driver({ database, tableName: config.tableName ?? 'astro_sessions' })
}
