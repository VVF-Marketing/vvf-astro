// Readiness: 200 only when the database and media storage answer (see
// src/lib/health.ts). Platforms switch traffic to an instance once it's ready.
import type { APIRoute } from 'astro'
import { sql } from 'kysely'
import { getDb } from 'emdash/runtime'
import { NO_STORE, readiness } from '../lib/health'

export const prerender = false

export const GET: APIRoute = async ({ locals }) => {
  const emdash = (locals as { emdash?: { storage?: { exists(key: string): Promise<boolean> } | null } }).emdash
  const { status, body } = await readiness({
    // A real round trip on the database EmDash's queries use (its content
    // queries may be cached, which could hide an outage).
    db: async () => {
      await sql`select 1`.execute(await getDb())
    },
    // Any answer (true or false) proves the store is reachable.
    storage: async () => {
      if (!emdash?.storage) throw new Error('no storage')
      await emdash.storage.exists('.readyz')
    },
  })
  return new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, 'Content-Type': 'application/json' } })
}
