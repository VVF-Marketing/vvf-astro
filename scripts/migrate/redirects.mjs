// Webflow's 301 redirect list (Site settings › Publishing › 301 redirects,
// exported as CSV) → this project's redirects (spec 2.6).
//
// The export lives in the gitignored raw-dump folder
// (scripts/migrate/snapshot/api/webflow-redirects.csv): about a third of its
// old addresses carry children's full names. Redirects to child profiles go
// into EmDash's redirects table through seed/seed.local.json only (and to
// production through the data import), never into the repository. The rest
// are in src/lib/legacyRoutes.mjs (WEBFLOW_REDIRECTS), generated from this
// list once and reviewed.
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { projectPathFor } from '../../src/lib/legacyRoutes.mjs'
import { SNAPSHOT_DIR } from './lib/paths.mjs'

export const WEBFLOW_REDIRECTS_CSV = path.join(SNAPSHOT_DIR, 'api/webflow-redirects.csv')

const trimSlash = (p) => p.replace(/\/+$/, '') || '/'

/** @param {string} csv  "source,target" rows with a header line */
export function parseRedirectsCsv(csv) {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const i = line.indexOf(',')
      return { source: line.slice(0, i).trim(), target: line.slice(i + 1).trim() }
    })
    .filter((r) => r.source && r.target)
}

// A Webflow target (a live path, maybe under /es) → this project's path.
export function resolveTarget(target) {
  let p = trimSlash(target)
  const es = p === '/es' || p.startsWith('/es/')
  if (es) p = trimSlash(p.slice(3))
  const resolved = projectPathFor(p)
  return es ? (resolved === '/' ? '/es' : `/es${resolved}`) : resolved
}

export const isChildPath = (p) => /^(\/es)?\/children\/[^/]+$/.test(p)

// Exact (non-pattern) redirects to child profiles, as EmDash seed redirects.
export function childRedirects(rows) {
  return rows
    .filter((r) => !/[(*]|%1/.test(r.source + r.target))
    .map((r) => ({ source: trimSlash(decodeURI(r.source)), destination: resolveTarget(r.target) }))
    .filter((r) => isChildPath(r.destination) && r.source !== r.destination)
    .map((r) => ({ ...r, type: 301, enabled: true, groupName: 'Webflow: child profiles' }))
}

export function readWebflowRedirects(file = WEBFLOW_REDIRECTS_CSV) {
  return existsSync(file) ? parseRedirectsCsv(readFileSync(file, 'utf8')) : []
}
