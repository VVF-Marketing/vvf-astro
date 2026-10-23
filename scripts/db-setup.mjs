#!/usr/bin/env node
// `npm run db:setup` (and `npm run seed` in Postgres mode): prepare a Postgres
// database for the site (openspec/changes/make-app-portable, design D6).
// 1. Apply EmDash's migrations (`emdash migrate`, reads DATABASE_URL).
// 2. Upload the public seed media (seed/media/manifest.json, never child
//    media) to the configured storage and create its media rows
//    (scripts/lib/seed-media.mjs; openspec/changes/seed-postgres-with-media).
// 3. Seed the public seed/seed.json (no child data). With
//    SEED_FIXTURE_CHILDREN=1, stand-in children and their placeholder photo
//    are added (scripts/lib/fixture-children.mjs): CI's container job and
//    the preview parent only, never production.
// Steps 2-3 run only into an empty database; existing content is never
// re-seeded unless --force. With --no-seed, stop after migrations (a target
// for npm run data:import).
// Needs DB_ADAPTER=postgres and DATABASE_URL (or DATABASE_URL_UNPOOLED, the
// direct connection, which it prefers); STORAGE=s3 (with S3_*) uploads
// media to the bucket, otherwise to ./uploads.
//
// Migrating needs the target confirmed first (confirmTarget): a pinned
// fingerprint (EMDASH_TARGET_FINGERPRINT or --expected-target-fingerprint=),
// --yes or CI, or a yes in a terminal.
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Kysely, sql } from 'kysely'
import { applySeed } from 'emdash/seed'
import { openStorageKind } from './lib/storage.mjs'
import { readManifests, seedMedia } from './lib/seed-media.mjs'
import { FIXTURE_MEDIA, withFixtureChildren } from './lib/fixture-children.mjs'
import { createDirectDialect, directDatabaseUrl } from '../src/lib/db/postgresRuntime.mjs'
import { confirmDestructive } from './lib/confirm.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

// The same choice as the site's (astro.config.mjs), except that it must be
// explicit: a Postgres environment set up without STORAGE=s3 would put the
// media on the machine running setup, where the deployed site can't see it
// (review finding on PR #26). STORAGE=local is the deliberate disk option.
export function openStorage(env = process.env) {
  if (['s3', 'blob', 'local'].includes(env.STORAGE)) return openStorageKind(env.STORAGE, { dir: path.join(ROOT, 'uploads'), env })
  throw new Error('Set STORAGE=s3 (with the S3_* settings) or STORAGE=blob (with BLOB_READ_WRITE_TOKEN) so the seed media goes to the storage the site reads, or STORAGE=local to upload to ./uploads.')
}

// Where setup is about to write, without credentials: "host:port/database".
export function describeTarget(url) {
  try {
    const u = new URL(url)
    return `${u.hostname}${u.port ? `:${u.port}` : ''}${u.pathname}`
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

export const shouldSeed = (collectionCount, force = false) => force || collectionCount === 0

// The CLI reports on stderr; read both streams.
function emdash(args) {
  const r = spawnSync('npx', ['emdash', 'migrate', '--from-config', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, DB_ADAPTER: 'postgres', DATABASE_URL: directDatabaseUrl() } })
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`
  if (r.status !== 0) throw new Error(`emdash migrate failed:\n${out}`)
  return out
}

function targetFingerprint() {
  const fingerprint = emdash(['--status']).match(/Target fingerprint: (\S+)/)?.[1]
  if (!fingerprint) throw new Error('Could not read the migration target fingerprint from `emdash migrate --status`.')
  return fingerprint
}

// EmDash applies migrations without asking only when given the target's
// fingerprint: proof that someone confirmed which database this is. Pass it
// on only once the target is confirmed here:
// - a pinned fingerprint (a deploy's EMDASH_TARGET_FINGERPRINT) must match,
//   and then no one is asked, unless the run also overwrites content;
// - otherwise --yes or CI, or a yes in a terminal (confirmDestructive).
export async function confirmTarget({ target, fingerprint, pinned, seed = true, force = false, ask = false, confirmOptions } = {}) {
  if (pinned && pinned !== fingerprint) {
    throw new Error(`The target's fingerprint (${fingerprint}) doesn't match the expected one (${pinned}): check DATABASE_URL.`)
  }
  if (pinned && !force && !ask) return true
  return confirmDestructive(
    `This migrates${seed ? ' and seeds' : ''} the Postgres database at ${target} (fingerprint ${fingerprint})${force ? ', re-applying the seed over existing content (--force)' : ''}.`,
    confirmOptions
  )
}

// The seed and media manifest to apply: the public ones, plus the stand-in
// children when asked for (never real child data: a seed that already has
// children is left as it is).
export function seedInputs(seed, { standIns = false } = {}) {
  const manifest = readManifests({ children: false }).public
  if (!standIns) return { seed, manifest }
  return { seed: withFixtureChildren(seed), manifest: { ...manifest, ...FIXTURE_MEDIA } }
}

export async function setupDatabase({
  seedFile = path.join(ROOT, 'seed/seed.json'),
  force = false,
  seed = true,
  confirm = false,
  expectedFingerprint = process.env.EMDASH_TARGET_FINGERPRINT || undefined,
  storage,
  standIns = process.env.SEED_FIXTURE_CHILDREN === '1',
  log = console.log,
} = {}) {
  const target = describeTarget(directDatabaseUrl())
  // Before anything is written: where the seed media will go.
  const mediaStorage = seed ? (storage ?? openStorage()) : undefined
  const fingerprint = targetFingerprint()
  log(`Target: Postgres ${target}, fingerprint ${fingerprint}`)
  // `npm run seed` in Postgres mode and --force (re-applying the seed over
  // content) always ask; CI and the compose setup job pass --yes or CI.
  if (!(await confirmTarget({ target, fingerprint, pinned: expectedFingerprint, seed, force, ask: confirm }))) process.exit(1)
  const executed = emdash([`--expected-target-fingerprint=${fingerprint}`]).match(/Executed: (.*)/)?.[1]?.trim() ?? ''
  log(`Migrations: ${executed && executed !== 'none' ? executed.split(',').length + ' applied' : 'up to date'}`)
  if (!seed) return { seeded: false } // --no-seed: an empty, migrated database (e.g. for npm run data:import)
  const db = new Kysely({ dialect: createDirectDialect() })
  try {
    const { rows } = await sql`select count(*)::int as n from _emdash_collections`.execute(db)
    if (!shouldSeed(rows[0].n, force)) {
      log(`Seed skipped: the database already has ${rows[0].n} collections (use --force to re-apply).`)
      return { seeded: false }
    }
    const inputs = seedInputs(JSON.parse(readFileSync(seedFile, 'utf8')), { standIns })
    const media = await seedMedia({ db, storage: mediaStorage, manifest: inputs.manifest, force })
    log(`Media: ${media.uploaded} uploaded, ${media.skipped} already present.`)
    const result = await applySeed(db, inputs.seed, { includeContent: true })
    log(`Seeded ${path.relative(ROOT, seedFile)}${standIns ? ' with stand-in children' : ''}: ${result.collections.created} collections, ${result.content.created} entries, ${result.menus.created} menus.`)
    return { seeded: true, result, media }
  } finally {
    await db.destroy()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const seedArg = process.argv.find((a) => a.startsWith('--seed='))?.slice('--seed='.length)
  const pinnedArg = process.argv.find((a) => a.startsWith('--expected-target-fingerprint='))?.slice('--expected-target-fingerprint='.length)
  await setupDatabase({
    seedFile: seedArg ? path.resolve(seedArg) : undefined,
    force: process.argv.includes('--force'),
    seed: !process.argv.includes('--no-seed'),
    ...(pinnedArg && { expectedFingerprint: pinnedArg }),
  })
}
