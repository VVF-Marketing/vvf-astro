// Static-page sync once per deployment (openspec/changes/run-on-vercel-functions,
// design D5). On Vercel every new instance is a new process, so "once per
// process" would mean many overlapping syncs per deploy, and overlapping runs
// can create duplicate rows. On Postgres the sync runs under a
// transaction-scoped advisory lock (safe through a transaction-mode pooler),
// and a one-row marker records which deployment last synced: a later instance
// of the same deployment skips. An instance that can't get the lock skips too,
// since the holder is syncing. SQLite (local dev, one process) syncs as before.
import { sql, type Kysely } from 'kysely'

// Arbitrary, fixed key for pg_try_advisory_xact_lock ("vvf" + "sync").
export const SYNC_LOCK_KEY = 7_667_602

export type DeploymentSyncOutcome<T> =
  | { ran: true; result: T }
  | { ran: false; reason: 'already-synced' | 'busy' }

export interface DeploymentSyncOptions<T> {
  // Postgres database; omit (SQLite) to sync without coordination.
  db?: Kysely<any>
  deploymentId: string
  sync: () => Promise<T>
  // Sync even if this deployment already did (the pipeline's trigger).
  force?: boolean
}

export async function syncOncePerDeployment<T>({ db, deploymentId, sync, force = false }: DeploymentSyncOptions<T>): Promise<DeploymentSyncOutcome<T>> {
  if (!db) return { ran: true, result: await sync() }
  return db.transaction().execute(async (trx): Promise<DeploymentSyncOutcome<T>> => {
    const { rows } = await sql<{ locked: boolean }>`select pg_try_advisory_xact_lock(${SYNC_LOCK_KEY}) as locked`.execute(trx)
    if (!rows[0]?.locked) return { ran: false, reason: 'busy' }
    await sql`create table if not exists vvf_static_page_sync (id integer primary key, deployment_id text not null, synced_at text not null)`.execute(trx)
    if (!force) {
      const marker = await sql<{ deployment_id: string }>`select deployment_id from vvf_static_page_sync where id = 1`.execute(trx)
      if (marker.rows[0]?.deployment_id === deploymentId) return { ran: false, reason: 'already-synced' }
    }
    const result = await sync()
    await sql`insert into vvf_static_page_sync (id, deployment_id, synced_at) values (1, ${deploymentId}, ${new Date().toISOString()})
      on conflict (id) do update set deployment_id = excluded.deployment_id, synced_at = excluded.synced_at`.execute(trx)
    return { ran: true, result }
  })
}
