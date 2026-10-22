#!/usr/bin/env node
// Neon branches for pull-request previews (openspec/changes/add-vercel-deploy-pipeline, D1/D3):
//
//   node scripts/deploy/neon-branch.mjs ensure pr-12   # create or renew, export its URLs
//   node scripts/deploy/neon-branch.mjs delete pr-12
//
// Runs only in main's trusted deploy workflow, with NEON_API_KEY scoped to the
// preview project (NEON_PROJECT_ID). Branches come from the project's default
// branch (`vvf-preview/main`, public seed only) and expire after 14 days,
// renewed on every push. `ensure` masks both connection strings in the log
// and writes them to $GITHUB_ENV as DATABASE_URL (pooled) and
// DATABASE_URL_UNPOOLED (direct); it never prints them.
import { appendFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const API = 'https://console.neon.tech/api/v2'
export const EXPIRY_DAYS = 14

export function neonClient({ apiKey, projectId, fetch = globalThis.fetch }) {
  if (!apiKey || !projectId) throw new Error('NEON_API_KEY and NEON_PROJECT_ID are required.')
  async function call(method, path, body) {
    const res = await fetch(`${API}/projects/${projectId}${path}`, {
      method,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (method === 'DELETE' && res.status === 404) return null
    if (!res.ok) throw new Error(`Neon API ${method} ${path.split('?')[0]}: ${res.status}`)
    return res.status === 204 ? null : res.json()
  }
  return {
    findBranch: async (name) => (await call('GET', `/branches?search=${encodeURIComponent(name)}`)).branches.find((b) => b.name === name),
    createBranch: (name, expiresAt) => call('POST', '/branches', { branch: { name, expires_at: expiresAt }, endpoints: [{ type: 'read_write' }] }),
    renewBranch: (id, expiresAt) => call('PATCH', `/branches/${id}`, { branch: { expires_at: expiresAt } }),
    deleteBranch: (id) => call('DELETE', `/branches/${id}`),
    connectionUri: async (branchId, { database, role, pooled }) =>
      (await call('GET', `/connection_uri?branch_id=${branchId}&database_name=${encodeURIComponent(database)}&role_name=${encodeURIComponent(role)}&pooled=${pooled}`)).uri,
  }
}

export const expiryFrom = (now = new Date()) => new Date(now.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString()

export function checkBranchName(name) {
  if (!/^pr-\d+$/.test(name ?? '')) throw new Error(`Preview branches are named pr-<number>, not "${name}".`)
  return name
}

export async function ensureBranch(client, name, { database, role, now = new Date() }) {
  checkBranchName(name)
  const expiresAt = expiryFrom(now)
  const existing = await client.findBranch(name)
  let id
  if (existing) {
    id = existing.id
    await client.renewBranch(id, expiresAt)
  } else {
    id = (await client.createBranch(name, expiresAt)).branch.id
  }
  return {
    created: !existing,
    id,
    expiresAt,
    pooled: await client.connectionUri(id, { database, role, pooled: true }),
    direct: await client.connectionUri(id, { database, role, pooled: false }),
  }
}

export async function deleteBranch(client, name) {
  checkBranchName(name)
  const existing = await client.findBranch(name)
  if (!existing) return false
  await client.deleteBranch(existing.id)
  return true
}

export async function main(argv = process.argv.slice(2), env = process.env, { fetch, log = console.log, writeEnv = (line) => appendFileSync(env.GITHUB_ENV, line + '\n') } = {}) {
  const [command, name] = argv
  const client = neonClient({ apiKey: env.NEON_API_KEY, projectId: env.NEON_PROJECT_ID, fetch })
  if (command === 'ensure') {
    const branch = await ensureBranch(client, name, { database: env.NEON_DATABASE || 'neondb', role: env.NEON_ROLE || 'neondb_owner' })
    // Masked before anything could print them; then only later steps see them.
    log(`::add-mask::${branch.pooled}`)
    log(`::add-mask::${branch.direct}`)
    writeEnv(`DATABASE_URL=${branch.pooled}`)
    writeEnv(`DATABASE_URL_UNPOOLED=${branch.direct}`)
    log(`Neon branch ${name} ${branch.created ? 'created' : 'renewed'}, expires ${branch.expiresAt}.`)
  } else if (command === 'delete') {
    log((await deleteBranch(client, name)) ? `Neon branch ${name} deleted.` : `Neon branch ${name} doesn't exist.`)
  } else {
    throw new Error('Usage: neon-branch.mjs ensure|delete pr-<number>')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
