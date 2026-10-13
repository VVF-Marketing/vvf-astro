// Readiness for /readyz (openspec/changes/make-app-portable, design D7): the
// site can serve traffic only when its database and media storage answer.
// Platforms poll it before switching traffic (zero-downtime, blue/green).
// Reports booleans only, never errors or configuration.

export interface ReadinessChecks {
  db: () => Promise<unknown>
  storage: () => Promise<unknown>
}

export const NO_STORE = { 'Cache-Control': 'no-store' }

const within = <T>(work: Promise<T>, ms: number) =>
  Promise.race([work, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

// Logs only the check and the error's name: messages can carry connection
// strings or hostnames.
const passes = async (name: string, check: () => Promise<unknown>, ms: number) => {
  try {
    await within(check(), ms)
    return true
  } catch (error) {
    console.warn(`[readyz] ${name} check failed: ${error instanceof Error ? error.name : 'error'}`)
    return false
  }
}

export async function readiness(checks: ReadinessChecks, timeoutMs = 2000): Promise<{ status: 200 | 503; body: { db: boolean; storage: boolean } }> {
  const [db, storage] = await Promise.all([passes('database', checks.db, timeoutMs), passes('storage', checks.storage, timeoutMs)])
  return { status: db && storage ? 200 : 503, body: { db, storage } }
}
