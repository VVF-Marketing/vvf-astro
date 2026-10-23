#!/usr/bin/env node
// The preview parent, `vvf-preview/main` (openspec/changes/add-vercel-deploy-pipeline, D1):
//
//   node scripts/deploy/preview-parent.mjs snapshot   # once: keep today's main as seed-snapshot
//   node scripts/deploy/preview-parent.mjs reset      # put main back to seed-snapshot
//
// Runs only from the manual reset-preview-parent workflow on main, with
// NEON_API_KEY scoped to the preview project (NEON_PROJECT_ID). Resetting
// restores main from the snapshot instead of re-seeding, so the admin user and
// the static-page-sync token (EMDASH_SYNC_PAT) survive. Neon keeps main's old
// state as a backup branch and moves main's children (seed-snapshot, open
// pr-<n> branches) under it; the newest backup is kept as an undo, older ones
// are deleted once nothing hangs off them.
import { pathToFileURL } from 'node:url'
import { neonClient } from './neon-branch.mjs'

export const SNAPSHOT = 'seed-snapshot'
export const BACKUP_PREFIX = 'main-before-reset-'

export function parentClient(opts) {
  const { call } = neonClient(opts)
  return {
    listBranches: async () => (await call('GET', '/branches')).branches,
    createSnapshot: () => call('POST', '/branches', { branch: { name: SNAPSHOT } }),
    restore: (id, sourceId, backupName) => call('POST', `/branches/${id}/restore`, { source_branch_id: sourceId, preserve_under_name: backupName }),
    deleteBranch: (id) => call('DELETE', `/branches/${id}`),
  }
}

// "main-before-reset-20261023T013000Z": sorts by time.
export const backupName = (now = new Date()) => BACKUP_PREFIX + now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')

function defaultBranch(branches) {
  const main = branches.find((b) => b.default)
  if (!main) throw new Error('The preview project has no default branch.')
  return main
}

export async function takeSnapshot(client) {
  const branches = await client.listBranches()
  defaultBranch(branches)
  if (branches.some((b) => b.name === SNAPSHOT)) throw new Error(`${SNAPSHOT} already exists. Delete it in the Neon console first to take a new one.`)
  return (await client.createSnapshot()).branch.id
}

export async function reset(client, { now = new Date() } = {}) {
  const before = await client.listBranches()
  const main = defaultBranch(before)
  const snapshot = before.find((b) => b.name === SNAPSHOT)
  if (!snapshot) throw new Error(`No ${SNAPSHOT} branch: run the workflow with "snapshot" first.`)
  const backup = backupName(now)
  await client.restore(main.id, snapshot.id, backup)

  const after = await client.listBranches()
  const hasChildren = (b) => after.some((c) => c.parent_id === b.id)
  const pruned = []
  for (const b of after.filter((x) => x.name.startsWith(BACKUP_PREFIX) && x.name !== backup)) {
    if (hasChildren(b)) continue
    await client.deleteBranch(b.id)
    pruned.push(b.name)
  }
  return { backup, pruned }
}

export async function main(argv = process.argv.slice(2), env = process.env, { fetch, log = console.log } = {}) {
  const client = parentClient({ apiKey: env.NEON_API_KEY, projectId: env.NEON_PROJECT_ID, fetch })
  if (argv[0] === 'snapshot') {
    await takeSnapshot(client)
    log(`Took ${SNAPSHOT} from the preview project's main branch.`)
  } else if (argv[0] === 'reset') {
    const { backup, pruned } = await reset(client)
    log(`Restored main from ${SNAPSHOT}; its previous state is in ${backup}.`)
    if (pruned.length) log(`Deleted older backups: ${pruned.join(', ')}.`)
  } else {
    throw new Error('Usage: preview-parent.mjs snapshot|reset')
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()
