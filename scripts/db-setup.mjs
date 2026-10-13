#!/usr/bin/env node
// `npm run db:setup` (and `npm run seed` in Postgres mode): prepare a Postgres
// database for the site (openspec/changes/make-app-portable, design D6).
// 1. Apply EmDash's migrations (`emdash migrate`, reads DATABASE_URL).
// 2. Seed the public seed/seed.json (no child data) — only into an empty
//    database; existing content is never re-seeded unless --force. With
//    --no-seed, stop after migrations (a target for npm run data:import).
// Needs DB_ADAPTER=postgres and DATABASE_URL.
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
import { createDialect, databaseUrl } from '../src/lib/db/postgresRuntime.mjs'
import { confirmDestructive } from './lib/confirm.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')

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
  const r = spawnSync('npx', ['emdash', 'migrate', '--from-config', ...args], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, DB_ADAPTER: 'postgres' } })
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

export async function setupDatabase({
  seedFile = path.join(ROOT, 'seed/seed.json'),
  force = false,
  seed = true,
  confirm = false,
  expectedFingerprint = process.env.EMDASH_TARGET_FINGERPRINT || undefined,
  log = console.log,
} = {}) {
  const target = describeTarget(databaseUrl())
  const fingerprint = targetFingerprint()
  log(`Target: Postgres ${target}, fingerprint ${fingerprint}`)
  // `npm run seed` in Postgres mode and --force (re-applying the seed over
  // content) always ask; CI and the compose setup job pass --yes or CI.
  if (!(await confirmTarget({ target, fingerprint, pinned: expectedFingerprint, seed, force, ask: confirm }))) process.exit(1)
  const executed = emdash([`--expected-target-fingerprint=${fingerprint}`]).match(/Executed: (.*)/)?.[1]?.trim() ?? ''
  log(`Migrations: ${executed && executed !== 'none' ? executed.split(',').length + ' applied' : 'up to date'}`)
  if (!seed) return { seeded: false } // --no-seed: an empty, migrated database (e.g. for npm run data:import)
  const db = new Kysely({ dialect: createDialect() })
  try {
    const { rows } = await sql`select count(*)::int as n from _emdash_collections`.execute(db)
    if (!shouldSeed(rows[0].n, force)) {
      log(`Seed skipped: the database already has ${rows[0].n} collections (use --force to re-apply).`)
      return { seeded: false }
    }
    const result = await applySeed(db, JSON.parse(readFileSync(seedFile, 'utf8')), { includeContent: true })
    log(`Seeded ${path.relative(ROOT, seedFile)}: ${result.collections.created} collections, ${result.content.created} entries, ${result.menus.created} menus.`)
    return { seeded: true, result }
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
