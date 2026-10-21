// Sessions on Postgres survive dropped connections (openspec/changes/
// run-on-vercel-functions, D6): a frozen Vercel instance loses its sockets,
// and db0's own connector would keep using its dead client. Needs
// TEST_POSTGRES_URL (CI's container job); uses a scratch table.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Kysely, sql } from 'kysely'
import { createDialect } from 'emdash/db/postgres'

const url = process.env.TEST_POSTGRES_URL
const TABLE = 'vvf_test_sessions'
// The raw driver stores strings (unstorage serializes above it).
const SESSION = JSON.stringify({ user: 'editor@example.org' })

describe.skipIf(!url)('session driver on Postgres', () => {
  let admin: Kysely<any>
  let storage: { setItem(k: string, v: unknown): Promise<void>; getItem(k: string): Promise<unknown>; dispose?(): Promise<void> }

  beforeAll(async () => {
    process.env.DATABASE_URL = url
    admin = new Kysely<any>({ dialect: createDialect({ connectionString: url }) })
    await sql`drop table if exists ${sql.table(TABLE)}`.execute(admin)
    const { default: sessionDriver } = await import('./sessionDriver.mjs')
    storage = sessionDriver({ tableName: TABLE })
  })

  afterAll(async () => {
    await sql`drop table if exists ${sql.table(TABLE)}`.execute(admin)
    await admin.destroy()
  })

  it('stores and reads a session', async () => {
    await storage.setItem('sess-1', SESSION)
    expect(await storage.getItem('sess-1')).toBe(SESSION)
  })

  it('keeps working after its connections are dropped', async () => {
    await sql`select pg_terminate_backend(pid) from pg_stat_activity
      where datname = current_database() and pid <> pg_backend_pid() and application_name = ''`.execute(admin)
    await new Promise((r) => setTimeout(r, 200))
    expect(await storage.getItem('sess-1')).toBe(SESSION)
  })
})
