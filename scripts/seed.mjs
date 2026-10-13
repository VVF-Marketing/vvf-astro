#!/usr/bin/env node
// `npm run seed`: rebuild the local EmDash database from scratch, with media.
//
// 1. Remove data.db* and uploads/ (after confirming, see scripts/lib/confirm.mjs).
// 2. Regenerate seed/seed.json and seed/seed.local.json from the snapshot.
//    Media values are stable across databases (scripts/lib/seed-media.mjs),
//    so both files already carry them.
// 3. Apply seed/seed.local.json (schema + content).
// 4. Upload the media files into uploads/ and create their media rows
//    (seedMedia, the same step `npm run db:setup` uses for Postgres + S3).
//
// Children are included only when the gitignored child snapshot and media
// exist locally (`npm run migrate:extract`); CI seeds without them.
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { Kysely } from 'kysely'
import { createDialect } from 'emdash/db/sqlite'
import { createStorage } from 'emdash/storage/local'
import { confirmDestructive } from './lib/confirm.mjs'
import { readManifests, seedMedia } from './lib/seed-media.mjs'
import { transform } from './migrate/transform.mjs'
import { LOCAL_SEED_PATH, ROOT_DIR } from './migrate/lib/paths.mjs'

// Postgres (deployed mode): migrations, public media and the public seed
// (scripts/db-setup.mjs). Everything below is the local SQLite flow.
if (process.env.DB_ADAPTER === 'postgres') {
  const { setupDatabase } = await import('./db-setup.mjs')
  await setupDatabase({ force: process.argv.includes('--force'), confirm: true })
  process.exit(0)
}

const DB_PATH = path.join(ROOT_DIR, 'data.db')
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads')

if (existsSync(path.join(ROOT_DIR, 'data.db'))) {
  const ok = await confirmDestructive('npm run seed deletes the local database (data.db, with its users and API tokens) and uploads/, then rebuilds them.')
  if (!ok) process.exit(1)
}

for (const file of ['data.db', 'data.db-shm', 'data.db-wal']) rmSync(path.join(ROOT_DIR, file), { force: true })
rmSync(UPLOADS_DIR, { recursive: true, force: true })
// Left over from the old upload-through-a-dev-server flow.
rmSync(path.join(ROOT_DIR, 'seed/media/emdash-media.local.json'), { force: true })

console.log('\n▶ seed files')
console.log(await transform())
if (!existsSync(LOCAL_SEED_PATH)) throw new Error(`${LOCAL_SEED_PATH} was not written`)

console.log('\n▶ schema and content')
execFileSync('npx', ['emdash', 'seed', path.relative(ROOT_DIR, LOCAL_SEED_PATH)], { cwd: ROOT_DIR, stdio: 'inherit' })

console.log('\n▶ media')
const db = new Kysely({ dialect: createDialect({ url: `file:${DB_PATH}` }) })
try {
  const storage = createStorage({ directory: UPLOADS_DIR, baseUrl: '/_emdash/api/media/file' })
  const result = await seedMedia({ db, storage, manifest: readManifests().all })
  console.log(`uploaded ${result.uploaded}, already present ${result.skipped}`)
} finally {
  await db.destroy()
}
