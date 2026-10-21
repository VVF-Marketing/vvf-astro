// Handlers for the endpoints only the platform calls (openspec/changes/
// run-on-vercel-functions): Vercel Cron's scheduled work (D3) and the
// pipeline's static-page sync (D5). Both need a bearer secret, answer with
// status only, and log an error's name, never its message (it can carry
// connection strings), like /readyz.
import { timingSafeEqual } from 'node:crypto'
import { NO_STORE } from './health'
import type { DeploymentSyncOutcome } from './deploymentSync'

export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || !header?.startsWith('Bearer ')) return false
  const given = Buffer.from(header.slice('Bearer '.length))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}

const json = (body: unknown, status: number) => new Response(JSON.stringify(body), { status, headers: { ...NO_STORE, 'Content-Type': 'application/json' } })

const errorName = (error: unknown) => (error instanceof Error ? error.name : 'error')

interface Handler<T> {
  secret: string | undefined
  run: () => Promise<T>
  log?: (message: string) => void
}

// GET /api/cron/emdash: EmDash's scheduled publishing, plugin cron and cleanup.
export async function handleCron(request: Request, { secret, run, log = console.error }: Handler<unknown>): Promise<Response> {
  if (!bearerMatches(request.headers.get('authorization'), secret)) return json({ ok: false }, 401)
  try {
    await run()
    return json({ ok: true }, 200)
  } catch (error) {
    log(`[cron] scheduled tasks failed: ${errorName(error)}`)
    return json({ ok: false }, 500)
  }
}

// POST /api/internal/sync-static-pages: 200 with the counts, or 202 when
// another instance holds the sync (it's syncing this deployment already).
export async function handleSync<T extends object>(request: Request, { secret, run, log = console.error }: Handler<DeploymentSyncOutcome<T>>): Promise<Response> {
  if (!bearerMatches(request.headers.get('authorization'), secret)) return json({ ran: false }, 401)
  try {
    const outcome = await run()
    return outcome.ran ? json({ ran: true, ...outcome.result }, 200) : json({ ran: false, reason: outcome.reason }, 202)
  } catch (error) {
    log(`[static-page-sync] failed: ${errorName(error)}`)
    return json({ ran: false }, 500)
  }
}
