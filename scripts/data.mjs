#!/usr/bin/env node
// Portable data (openspec/changes/make-app-portable, design D8):
//
//   npm run data:export [-- --out <file.tar.gz>]
//   npm run data:import -- <file.tar.gz>
//
// One archive holds every database table (content, users, tokens, revisions,
// drafts, menus, settings...) and every media file, so a site can move
// between SQLite + disk and Postgres + S3, or between hosts.
//
// Source and target follow the same settings as the site: Postgres when
// DB_ADAPTER=postgres (DATABASE_URL), else the SQLite file ./data.db
// (--sqlite <path>); S3 when STORAGE=s3 (S3_*), else ./uploads (--uploads <dir>).
//
// Exports contain child data and account data: they're written outside the
// repository (default ~/vvf-exports/) and a path inside it is refused. Treat
// them as safeguarding data. Imports go into an empty, migrated database
// (npm run db:setup -- --no-seed), never over an existing site.
import { spawnSync } from 'node:child_process'
import { closeSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { Kysely, sql } from 'kysely'
import { applySeed } from 'emdash/seed'
import { createDialect as createSqliteDialect } from 'emdash/db/sqlite'
import { createStorage as createLocalStorage } from 'emdash/storage/local'
import { createStorage as createS3Storage } from 'emdash/storage/s3'
import { createDialect as createPostgresDialect } from '../src/lib/db/postgresRuntime.mjs'
import { contentTypeFor, listKeys } from './media-copy.mjs'
import { LEGACY_COLLECTIONS } from './migrate/copy-collections.mjs'

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const FORMAT_VERSION = 1
// Migration bookkeeping belongs to each database; sessions are per environment.
export const SKIP_TABLES = new Set(['_emdash_migrations', '_emdash_migrations_lock', 'astro_sessions'])

// Tables EmDash's migrations fill in a new database; every other table must
// be empty before an import (a target with users, media or content is a site).
export const MIGRATION_ROWS = new Set(['options', '_emdash_taxonomy_defs', '_emdash_media_usage_cleanup', '_emdash_media_usage_activation'])

export function tablesBlockingImport(rowCounts) {
  return Object.entries(rowCounts)
    .filter(([table, n]) => n > 0 && !SKIP_TABLES.has(table) && !MIGRATION_ROWS.has(table))
    .map(([table]) => table)
}

// --- pure helpers (unit-tested) ---------------------------------------------

export function isInside(file, dir) {
  const rel = path.relative(path.resolve(dir), path.resolve(file))
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

export function defaultExportPath(now = new Date()) {
  return path.join(homedir(), 'vvf-exports', `vvf-${now.toISOString().replace(/[:.]/g, '-')}.tar.gz`)
}

// JSON-safe values that load into either database: binary as base64, JSON
// objects (Postgres json columns) as JSON text, dates as ISO strings.
export function encodeValue(v) {
  if (v instanceof Uint8Array) return { $b64: Buffer.from(v).toString('base64') }
  if (v instanceof Date) return v.toISOString()
  if (v !== null && typeof v === 'object') return JSON.stringify(v)
  if (typeof v === 'bigint') return v.toString()
  return v
}

export function decodeValue(v) {
  return v !== null && typeof v === 'object' && typeof v.$b64 === 'string' ? Buffer.from(v.$b64, 'base64') : v
}

// Tables ordered so every table comes after the tables it references.
export function orderTables(tables, foreignKeys) {
  const deps = new Map(tables.map((t) => [t, new Set()]))
  for (const { table, ref } of foreignKeys) if (table !== ref && deps.has(table) && deps.has(ref)) deps.get(table).add(ref)
  const out = []
  const seen = new Set()
  const visit = (t, stack = new Set()) => {
    if (seen.has(t)) return
    if (stack.has(t)) throw new Error(`Circular foreign keys involving ${t}`)
    stack.add(t)
    for (const d of [...deps.get(t)].sort()) visit(d, stack)
    seen.add(t)
    out.push(t)
  }
  for (const t of [...tables].sort()) visit(t)
  return out
}

// Rows of a self-referencing table, parents before children.
export function orderRows(rows, idColumn, parentColumn) {
  const pending = [...rows]
  const placed = new Set()
  const out = []
  while (pending.length) {
    const before = pending.length
    for (let i = 0; i < pending.length; ) {
      const parent = pending[i][parentColumn]
      if (parent == null || placed.has(parent) || !rows.some((r) => r[idColumn] === parent)) {
        placed.add(pending[i][idColumn])
        out.push(pending.splice(i, 1)[0])
      } else i++
    }
    if (pending.length === before) throw new Error(`Rows reference each other in a cycle (${parentColumn})`)
  }
  return out
}

// A schema-only seed that makes EmDash create each collection's table on the
// target (its own registry builds the right SQL for that database).
export function schemaSeed(collectionRows, fieldRows) {
  const bool = (v) => v === 1 || v === true || v === '1'
  const json = (v) => (v == null || v === '' ? undefined : typeof v === 'string' ? JSON.parse(v) : v)
  return {
    version: '1',
    collections: collectionRows.map((c) => ({
      slug: c.slug,
      label: c.label,
      fields: fieldRows
        .filter((f) => f.collection_id === c.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((f) => ({
          slug: f.slug,
          label: f.label,
          type: f.type,
          required: bool(f.required),
          unique: bool(f.unique),
          indexed: bool(f.indexed),
          searchable: bool(f.searchable),
          translatable: f.translatable == null ? undefined : bool(f.translatable),
          validation: json(f.validation),
          options: json(f.options),
          widget: f.widget ?? undefined,
        })),
    })),
  }
}

// Collections not carried into an import: retired ones whose rows already
// moved (LEGACY_COLLECTIONS, e.g. a slug too long for Postgres). Any other
// collection whose identifiers don't fit Postgres stops the import.
export const RETIRED_COLLECTIONS = new Set(LEGACY_COLLECTIONS.map((l) => l.collection))
const PG_SAFE_SLUG = 35 // idx_ec_<slug>_deleted_published_id within 63 characters

export function collectionsToImport(collectionRows, targetKind) {
  const kept = collectionRows.filter((c) => !RETIRED_COLLECTIONS.has(c.slug))
  const tooLong = targetKind === 'postgres' ? kept.filter((c) => c.slug.length > PG_SAFE_SLUG).map((c) => c.slug) : []
  if (tooLong.length) throw new Error(`Collection name(s) too long for Postgres (max ${PG_SAFE_SLUG} characters): ${tooLong.join(', ')}`)
  return { kept, skipped: collectionRows.filter((c) => RETIRED_COLLECTIONS.has(c.slug)).map((c) => c.slug) }
}

// --- databases and storage --------------------------------------------------

export function describeEndpoint(env = process.env, args = {}) {
  return {
    db: env.DB_ADAPTER === 'postgres' ? { kind: 'postgres' } : { kind: 'sqlite', path: path.resolve(args.sqlite ?? path.join(ROOT, 'data.db')) },
    storage: env.STORAGE === 's3' ? { kind: 's3' } : { kind: 'local', dir: path.resolve(args.uploads ?? path.join(ROOT, 'uploads')) },
  }
}

const label = (e) => `${e.db.kind === 'postgres' ? 'Postgres' : `SQLite ${e.db.path}`} + ${e.storage.kind === 's3' ? `S3 ${process.env.S3_BUCKET}` : `disk ${e.storage.dir}`}`

function openDb(desc) {
  return new Kysely({ dialect: desc.kind === 'postgres' ? createPostgresDialect() : createSqliteDialect({ url: `file:${desc.path}` }) })
}

function openStorage(desc) {
  return desc.kind === 's3' ? createS3Storage({}) : createLocalStorage({ directory: desc.dir, baseUrl: '/_emdash/api/media/file' })
}

async function listTables(db, kind) {
  const rows =
    kind === 'postgres'
      ? (await sql`select tablename as name from pg_tables where schemaname = current_schema()`.execute(db)).rows
      : (await sql`select name from sqlite_master where type = 'table' and name not like 'sqlite_%'`.execute(db)).rows
  return rows.map((r) => r.name).filter((n) => !SKIP_TABLES.has(n) && !/_fts(_|$)/.test(n)).sort()
}

async function listForeignKeys(db, kind, tables) {
  if (kind === 'postgres') {
    const { rows } = await sql`
      select kcu.table_name as "table", ccu.table_name as ref, kcu.column_name as "column", ccu.column_name as "refColumn"
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
      where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = current_schema()`.execute(db)
    return rows
  }
  const out = []
  for (const table of tables) {
    const { rows } = await sql`select "table" as ref, "from" as "column", "to" as "refColumn" from pragma_foreign_key_list(${table})`.execute(db)
    for (const r of rows) out.push({ table, ...r })
  }
  return out
}

async function tableColumns(db, kind, table) {
  const { rows } =
    kind === 'postgres'
      ? await sql`select column_name as name from information_schema.columns where table_schema = current_schema() and table_name = ${table}`.execute(db)
      : await sql`select name from pragma_table_info(${table})`.execute(db)
  return new Set(rows.map((r) => r.name))
}

async function listMediaKeys(storage, desc) {
  if (desc.kind === 'local') return existsSync(desc.dir) ? listKeys(desc.dir) : []
  const keys = []
  let cursor
  do {
    const page = await storage.list({ cursor, limit: 1000 })
    keys.push(...page.files.map((f) => f.key))
    cursor = page.nextCursor
  } while (cursor)
  return keys.sort()
}

// --- export -------------------------------------------------------------------

export async function exportData({ source = describeEndpoint(), out = defaultExportPath(), log = console.log } = {}) {
  if (isInside(out, ROOT)) throw new Error(`Refusing to write an export inside the repository (${out}): exports contain child data.`)
  const work = mkdtempSync(path.join(tmpdir(), 'vvf-export-'))
  const db = openDb(source.db)
  try {
    mkdirSync(path.join(work, 'db'))
    const tables = await listTables(db, source.db.kind)
    const counts = {}
    for (const table of tables) {
      const rows = await db.selectFrom(table).selectAll().execute()
      writeFileSync(path.join(work, 'db', `${table}.jsonl`), rows.map((r) => JSON.stringify(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, encodeValue(v)])))).join('\n') + (rows.length ? '\n' : ''))
      counts[table] = rows.length
    }
    const storage = openStorage(source.storage)
    const keys = await listMediaKeys(storage, source.storage)
    for (const key of keys) {
      const file = path.join(work, 'media', key)
      mkdirSync(path.dirname(file), { recursive: true })
      const { body } = await storage.download(key)
      await pipeline(Readable.fromWeb(body), createWriteStream(file))
    }
    const manifest = { format: FORMAT_VERSION, createdAt: new Date().toISOString(), source: { db: source.db.kind, storage: source.storage.kind }, tables: counts, media: keys.length }
    writeFileSync(path.join(work, 'manifest.json'), JSON.stringify(manifest, null, 2))
    // Readable only by its owner: the archive holds child and account data.
    // The folder is created 0700 when it doesn't exist yet, and the file is
    // created 0600 (never over an existing file) before tar writes into it.
    mkdirSync(path.dirname(path.resolve(out)), { recursive: true, mode: 0o700 })
    const fd = openSync(path.resolve(out), 'wx', 0o600)
    let tar
    try {
      tar = spawnSync('tar', ['-czf', '-', '-C', work, '.'], { stdio: ['ignore', fd, 'pipe'], encoding: 'utf8' })
    } finally {
      closeSync(fd)
    }
    if (tar.status !== 0) throw new Error(`tar failed: ${tar.stderr}`)
    log(`Exported ${label(source)}: ${tables.length} tables, ${Object.values(counts).reduce((a, b) => a + b, 0)} rows, ${keys.length} media files -> ${out}`)
    return { out, manifest }
  } finally {
    await db.destroy()
    rmSync(work, { recursive: true, force: true })
  }
}

// --- import -------------------------------------------------------------------

const readJsonl = (file) => (existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])

export async function importData({ archive, target = describeEndpoint(), log = console.log } = {}) {
  const work = mkdtempSync(path.join(tmpdir(), 'vvf-import-'))
  const tar = spawnSync('tar', ['-xzf', path.resolve(archive), '-C', work], { encoding: 'utf8' })
  if (tar.status !== 0) throw new Error(`Could not read ${archive}: ${tar.stderr}`)
  const manifest = JSON.parse(readFileSync(path.join(work, 'manifest.json'), 'utf8'))
  if (manifest.format !== FORMAT_VERSION) throw new Error(`Unsupported export format ${manifest.format}`)
  const db = openDb(target.db)
  try {
    const tables = await listTables(db, target.db.kind)
    if (!tables.includes('_emdash_collections')) throw new Error('The target database has no EmDash schema yet: run migrations first (npm run db:setup -- --no-seed).')
    const targetRows = {}
    for (const t of tables) targetRows[t] = Number((await db.selectFrom(t).select(sql`count(*)`.as('n')).executeTakeFirst()).n)
    const blocking = tablesBlockingImport(targetRows)
    if (blocking.length) {
      throw new Error(`The target database isn't empty (rows in ${blocking.join(', ')}). Import only into an empty, migrated database (npm run db:setup -- --no-seed).`)
    }

    const archiveRows = (t) => readJsonl(path.join(work, 'db', `${t}.jsonl`)).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, decodeValue(v)])))
    // All or nothing: a failed import leaves the target empty, ready to retry.
    const counts = {}
    let order = []
    await db.transaction().execute(async (trx) => {
    // 1. Collection tables, built by EmDash for this database.
    const { kept, skipped } = collectionsToImport(archiveRows('_emdash_collections'), target.db.kind)
    if (skipped.length) log(`Retired collections not imported: ${skipped.join(', ')}`)
    const keptIds = new Set(kept.map((c) => c.id))
    const skipTable = (t) => skipped.some((slug) => t === `ec_${slug}`)
    const rowsFor = (t) => {
      const rows = archiveRows(t)
      if (t === '_emdash_collections') return rows.filter((r) => keptIds.has(r.id))
      if (t === '_emdash_fields') return rows.filter((r) => keptIds.has(r.collection_id))
      return rows
    }
    await applySeed(trx, schemaSeed(kept, rowsFor('_emdash_fields')), { includeContent: false })

    // 2. Every table's rows, replacing what the schema step wrote, in
    //    foreign-key order (parents first, also within self-referencing tables).
    const targetTables = await listTables(trx, target.db.kind)
    const fks = await listForeignKeys(trx, target.db.kind, targetTables)
    const inArchive = new Set(Object.keys(manifest.tables).filter((t) => !skipTable(t)))
    order = orderTables(targetTables.filter((t) => inArchive.has(t)), fks)
    const missing = [...inArchive].filter((t) => !targetTables.includes(t))
    if (missing.length) log(`Not in the target schema, skipped: ${missing.join(', ')}`)
    for (const table of [...order].reverse()) await trx.deleteFrom(table).execute()
    for (const table of order) {
      const columns = await tableColumns(trx, target.db.kind, table)
      const source = rowsFor(table)
      let rows = source.map((r) => Object.fromEntries(Object.entries(r).filter(([k]) => columns.has(k))))
      const self = fks.find((f) => f.table === table && f.ref === table)
      if (self) rows = orderRows(rows, self.refColumn, self.column)
      for (let i = 0; i < rows.length; i += 100) await trx.insertInto(table).values(rows.slice(i, i + 100)).execute()
      counts[table] = rows.length
      if (rows.length !== source.length) throw new Error(`${table}: imported ${rows.length} rows, archive has ${source.length}`)
    }
    })

    // 3. Media into the target storage.
    const mediaDir = path.join(work, 'media')
    const storage = openStorage(target.storage)
    let copied = 0
    for (const key of existsSync(mediaDir) ? listKeys(mediaDir) : []) {
      if (!(await storage.exists(key))) {
        await storage.upload({ key, body: readFileSync(path.join(mediaDir, key)), contentType: contentTypeFor(key) })
        copied++
      }
    }
    log(`Imported into ${label(target)}: ${order.length} tables, ${Object.values(counts).reduce((a, b) => a + b, 0)} rows, ${copied} media files (archive from ${manifest.createdAt}).`)
    return { counts, media: copied }
  } finally {
    await db.destroy()
    rmSync(work, { recursive: true, force: true })
  }
}

// --- CLI ------------------------------------------------------------------------

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [command, ...rest] = process.argv.slice(2)
  const flag = (name) => {
    const i = rest.indexOf(`--${name}`)
    return i >= 0 ? rest[i + 1] : undefined
  }
  const endpoint = describeEndpoint(process.env, { sqlite: flag('sqlite'), uploads: flag('uploads') })
  if (command === 'export') await exportData({ source: endpoint, out: flag('out') ? path.resolve(flag('out')) : undefined })
  else if (command === 'import') {
    const archive = rest.find((a) => a.endsWith('.tar.gz'))
    if (!archive) throw new Error('Usage: npm run data:import -- <export.tar.gz>')
    await importData({ archive, target: endpoint })
  } else throw new Error('Usage: node scripts/data.mjs export|import ...')
}
