#!/usr/bin/env node
// Pre-deploy settings check (openspec/changes/add-vercel-deploy-pipeline, D5):
//
//   node scripts/deploy/check-settings.mjs --environment preview [--with NAME ...]
//
// Lists the Vercel environment's variable NAMES (`vercel env ls --json`),
// adds the ones the deploy sets itself (`--with`, e.g. DATABASE_URL passed
// with `vercel deploy --env`), and checks them with the same missingSettings
// the site's guard uses, for the deployed mode (Vercel + Postgres + Blob).
// A listed name counts as set: production variables are sensitive, so their
// values can't be read anyway. Values are never printed; the CLI's JSON can
// include readable values, so it's parsed here and only names are kept.
import { execFileSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { missingSettings } from '../lib/settings.mjs'

export const DEPLOYED_MODE = { DEPLOY_TARGET: 'vercel', DB_ADAPTER: 'postgres', STORAGE: 'blob' }

// `vercel env ls --json` → the variable names, nothing else.
export function namesFromEnvLs(output) {
  const parsed = JSON.parse(output)
  const envs = Array.isArray(parsed) ? parsed : (parsed.envs ?? [])
  return [...new Set(envs.map((e) => e?.key).filter((k) => typeof k === 'string' && k))]
}

export function checkSettings({ names, mode = DEPLOYED_MODE }) {
  const present = Object.fromEntries(names.map((n) => [n, 'set']))
  return missingSettings({ ...present, ...mode })
}

export function parseArgs(argv) {
  const out = { environment: undefined, with: [] }
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--environment') out.environment = argv[++i]
    else if (argv[i] === '--with') out.with.push(argv[++i])
  }
  if (!['production', 'preview'].includes(out.environment)) throw new Error('Usage: check-settings.mjs --environment production|preview [--with NAME ...]')
  return out
}

const listNames = (environment) => execFileSync('vercel', ['env', 'ls', environment, '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

export function main(argv = process.argv.slice(2), { list = listNames, log = console.log, error = console.error } = {}) {
  const args = parseArgs(argv)
  const names = [...namesFromEnvLs(list(args.environment)), ...args.with]
  const missing = checkSettings({ names })
  if (missing.length) {
    error(`Missing required settings in ${args.environment}: ${missing.join(', ')}`)
    return 1
  }
  log(`All required settings are set in ${args.environment} (${names.length} names checked).`)
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = main()
