#!/usr/bin/env node
// After a deploy (openspec/changes/add-vercel-deploy-pipeline, D3; preview step
// 6, production step 7):
//
//   node scripts/deploy/ready-and-sync.mjs <deployment-url>
//
// 1. Wait until /readyz answers 200 (the database and storage answer).
// 2. POST /api/internal/sync-static-pages with EMDASH_SYNC_PAT. A 202 means
//    another instance holds the sync: retry until 200. Anything else, or no
//    200 within the time limit, fails the deploy (run-on-vercel-functions).
//
// VERCEL_AUTOMATION_BYPASS_SECRET, when set, is sent as Vercel's protection
// bypass header, for protected preview deployments. Secrets are never printed.
import { pathToFileURL } from 'node:url'

export const READY_TIMEOUT_MS = 3 * 60 * 1000
export const SYNC_TIMEOUT_MS = 2 * 60 * 1000
const INTERVAL_MS = 5000

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export async function waitForReady(base, { headers = {}, fetch = globalThis.fetch, wait = sleep, now = Date.now, timeoutMs = READY_TIMEOUT_MS, log = () => {} } = {}) {
  const deadline = now() + timeoutMs
  let last = 'no answer'
  while (now() < deadline) {
    try {
      const res = await fetch(new URL('/readyz', base), { headers })
      if (res.status === 200) return true
      last = String(res.status)
    } catch (error) {
      last = error.code ?? error.name ?? 'fetch failed'
    }
    log(`/readyz: ${last}, waiting`)
    await wait(INTERVAL_MS)
  }
  throw new Error(`${base} wasn't ready within ${Math.round(timeoutMs / 1000)} s (last: ${last}).`)
}

export async function syncStaticPages(base, { token, headers = {}, fetch = globalThis.fetch, wait = sleep, now = Date.now, timeoutMs = SYNC_TIMEOUT_MS, log = () => {} } = {}) {
  if (!token) throw new Error('EMDASH_SYNC_PAT is required to sync static pages.')
  const deadline = now() + timeoutMs
  while (true) {
    const res = await fetch(new URL('/api/internal/sync-static-pages', base), { method: 'POST', headers: { ...headers, Authorization: `Bearer ${token}` } })
    if (res.status === 200) return res.json().catch(() => ({}))
    if (res.status !== 202) throw new Error(`Static-page sync answered ${res.status}.`)
    if (now() >= deadline) throw new Error(`Static-page sync was still busy after ${Math.round(timeoutMs / 1000)} s.`)
    log('Static-page sync busy (202), retrying')
    await wait(INTERVAL_MS)
  }
}

export function bypassHeaders(env = process.env) {
  return env.VERCEL_AUTOMATION_BYPASS_SECRET ? { 'x-vercel-protection-bypass': env.VERCEL_AUTOMATION_BYPASS_SECRET } : {}
}

export async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const base = argv[0]
  if (!/^https:\/\//.test(base ?? '')) throw new Error('Usage: ready-and-sync.mjs https://<deployment-url>')
  const log = deps.log ?? console.log
  const headers = bypassHeaders(env)
  await waitForReady(base, { ...deps, headers, log })
  log(`${base} is ready.`)
  const counts = await syncStaticPages(base, { ...deps, headers, token: env.EMDASH_SYNC_PAT, log })
  log(`Static pages synced: ${JSON.stringify(counts)}`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
