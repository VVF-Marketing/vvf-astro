#!/usr/bin/env node
// `npm run seed`: rebuild the local EmDash database from scratch, with media.
//
// 1. Remove data.db* and uploads/ (after confirming, see scripts/lib/confirm.mjs).
// 2. Regenerate seed/seed.json from the snapshot and apply it (EmDash 0.38
//    also applies its content despite --no-content; step 4 overwrites it).
// 3. Start a dev server on a spare port and upload every harvested media
//    file into EmDash's media library (scripts/migrate/media.mjs).
// 4. Stop the server, regenerate seed/seed.local.json with the new media
//    values (scripts/migrate/transform.mjs), and apply it.
//
// Children are included only when the gitignored child snapshot exists
// locally (`npm run migrate:extract`); CI seeds without them.
import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { dev } from 'astro'
import { confirmDestructive } from './lib/confirm.mjs'
import { importMedia } from './migrate/media.mjs'
import { transform } from './migrate/transform.mjs'
import { LOCAL_SEED_PATH, ROOT_DIR, SEED_PATH } from './migrate/lib/paths.mjs'

// Postgres (deployed mode): migrations + the public seed, no local files
// (scripts/db-setup.mjs). Everything below is the local SQLite flow.
if (process.env.DB_ADAPTER === 'postgres') {
  const { setupDatabase } = await import('./db-setup.mjs')
  await setupDatabase({ force: process.argv.includes('--force'), confirm: true })
  process.exit(0)
}

const PORT = Number(process.env.SEED_PORT ?? 4398)

function emdash(...args) {
  execFileSync('npx', ['emdash', ...args], { cwd: ROOT_DIR, stdio: 'inherit' })
}

if (existsSync(path.join(ROOT_DIR, 'data.db'))) {
  const ok = await confirmDestructive('npm run seed deletes the local database (data.db, with its users and API tokens) and uploads/, then rebuilds them.')
  if (!ok) process.exit(1)
}

for (const file of ['data.db', 'data.db-shm', 'data.db-wal']) rmSync(path.join(ROOT_DIR, file), { force: true })
rmSync(path.join(ROOT_DIR, 'uploads'), { recursive: true, force: true })
rmSync(path.join(ROOT_DIR, 'seed/media/emdash-media.local.json'), { force: true })

// Regenerate seed/seed.json from the snapshot first so its content always
// matches the current schema (no media values yet).
console.log('\n▶ schema')
await transform()
emdash('seed', path.relative(ROOT_DIR, SEED_PATH), '--no-content')

console.log(`\n▶ media (dev server on :${PORT})`)
// The fresh database has no API tokens, so the static-page sync middleware
// (src/middleware.ts) would fail with any EMDASH_SYNC_PAT from .env. Vite
// prefers process.env over .env files; an empty value makes it skip the sync.
process.env.EMDASH_SYNC_PAT = ''
const server = await dev({ root: ROOT_DIR, server: { port: PORT }, logLevel: 'error' })
let result
try {
  result = await importMedia({ baseUrl: `http://localhost:${PORT}` })
} finally {
  await server.stop()
}
console.log(`uploaded ${result.uploaded}, failed ${result.failures.length}`)
if (result.failures.length) {
  for (const f of result.failures) console.error(`  ${f.reason} — ${f.url}`)
  process.exit(1)
}

console.log('\n▶ content')
console.log(await transform())
if (!existsSync(LOCAL_SEED_PATH)) throw new Error(`${LOCAL_SEED_PATH} was not written`)
// Step 2 also creates entries (without media); update them in place.
emdash('seed', path.relative(ROOT_DIR, LOCAL_SEED_PATH), '--on-conflict=update')
