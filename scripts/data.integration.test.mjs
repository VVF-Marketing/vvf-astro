// Integration test for npm run data:export / data:import (review finding on
// PR #25, Step 24): a real migrated and seeded database is exported and
// imported into an empty one, and every table must come back the same.
//
// Always: SQLite -> SQLite. With TEST_POSTGRES_URL (CI's container job):
// SQLite -> Postgres -> SQLite, the path a local site takes to a deployed one
// and back. TEST_POSTGRES_URL's database is wiped: point it at a scratch one.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Kysely, sql } from 'kysely'
import { runMigrations } from 'emdash/db'
import { createDialect as createSqliteDialect } from 'emdash/db/sqlite'
import { applySeed } from 'emdash/seed'
import { exportData, importData, ROOT, SKIP_TABLES } from './data.mjs'
import { createDialect as createPostgresDialect } from '../src/lib/db/postgresRuntime.mjs'

const TIMEOUT = 180_000
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7d6a4b30000000049454e44ae426082', 'hex')

let work
const quiet = () => {}
const sqliteDb = (file) => new Kysely({ dialect: createSqliteDialect({ url: `file:${file}` }) })
const local = (name) => ({ db: { kind: 'sqlite', path: path.join(work, `${name}.db`) }, storage: { kind: 'local', dir: path.join(work, `${name}-uploads`) } })

async function migrated(db) {
  await runMigrations(db)
  return db
}

// Every table's rows, in a stable order, as the export would carry them.
// Leaves out `revision` (options and plugin storage): a concurrency token
// that EmDash's triggers replace with a random one when a row is inserted
// with the initial '0', as migrations write it.
async function snapshot(file) {
  const db = sqliteDb(file)
  try {
    const { rows } = await sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`.execute(db)
    const tables = rows.map((r) => r.name).filter((n) => !SKIP_TABLES.has(n) && !/_fts(_|$)/.test(n)).sort()
    const out = {}
    for (const table of tables) {
      const all = await db.selectFrom(table).selectAll().execute()
      out[table] = all.map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'revision').sort(([a], [b]) => a.localeCompare(b))))).sort()
    }
    return out
  } finally {
    await db.destroy()
  }
}

beforeAll(async () => {
  work = mkdtempSync(path.join(tmpdir(), 'vvf-data-test-'))
  // The source: migrated, the public seed with content (both locales, menus),
  // and a media file on disk.
  const db = await migrated(sqliteDb(local('source').db.path))
  try {
    await applySeed(db, JSON.parse(readFileSync(path.join(ROOT, 'seed/seed.json'), 'utf8')), { includeContent: true })
  } finally {
    await db.destroy()
  }
  mkdirSync(path.join(local('source').storage.dir, 'media'), { recursive: true })
  writeFileSync(path.join(local('source').storage.dir, 'media', 'pixel.png'), PNG)
}, TIMEOUT)

afterAll(() => rmSync(work, { recursive: true, force: true }))

async function emptySqlite(name) {
  await (await migrated(sqliteDb(local(name).db.path))).destroy()
  return local(name)
}

describe('data export and import', () => {
  it(
    'round-trips every table and media file between SQLite databases',
    async () => {
      const archive = path.join(work, 'sqlite.tar.gz')
      await exportData({ source: local('source'), out: archive, log: quiet })
      const target = await emptySqlite('copy')
      await importData({ archive, target, log: quiet })

      const [source, copy] = await Promise.all([snapshot(local('source').db.path), snapshot(target.db.path)])
      expect(Object.keys(copy)).toEqual(Object.keys(source))
      for (const table of Object.keys(source)) expect(copy[table], table).toEqual(source[table])
      expect(source.ec_copy_home.length).toBeGreaterThan(0)
      expect(readFileSync(path.join(target.storage.dir, 'media', 'pixel.png'))).toEqual(PNG)
    },
    TIMEOUT
  )

  it(
    'refuses to import over an existing site',
    async () => {
      const archive = path.join(work, 'again.tar.gz')
      await exportData({ source: local('source'), out: archive, log: quiet })
      await expect(importData({ archive, target: local('copy'), log: quiet })).rejects.toThrow("isn't empty")
    },
    TIMEOUT
  )

  it.runIf(process.env.TEST_POSTGRES_URL)(
    'round-trips through Postgres and back',
    async () => {
      const env = process.env.DATABASE_URL
      process.env.DATABASE_URL = process.env.TEST_POSTGRES_URL
      const pg = new Kysely({ dialect: createPostgresDialect() })
      try {
        await sql`drop schema public cascade`.execute(pg)
        await sql`create schema public`.execute(pg)
        await runMigrations(pg)
        const viaPostgres = { db: { kind: 'postgres' }, storage: { kind: 'local', dir: path.join(work, 'pg-uploads') } }

        const toPg = path.join(work, 'to-pg.tar.gz')
        await exportData({ source: local('source'), out: toPg, log: quiet })
        await importData({ archive: toPg, target: viaPostgres, log: quiet })

        const back = path.join(work, 'from-pg.tar.gz')
        await exportData({ source: viaPostgres, out: back, log: quiet })
        const target = await emptySqlite('back')
        await importData({ archive: back, target, log: quiet })

        const [source, copy] = await Promise.all([snapshot(local('source').db.path), snapshot(target.db.path)])
        for (const table of Object.keys(source)) expect(copy[table], table).toEqual(source[table])
        expect(readFileSync(path.join(target.storage.dir, 'media', 'pixel.png'))).toEqual(PNG)
      } finally {
        await pg.destroy()
        process.env.DATABASE_URL = env
      }
    },
    TIMEOUT
  )
})
