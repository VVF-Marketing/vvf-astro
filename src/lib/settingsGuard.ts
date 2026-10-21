// Required settings on hosts without a launcher (openspec/changes/
// run-on-vercel-functions, design D2). On Vercel, scripts/start.mjs never
// runs, so the middleware checks once per instance: with a setting missing,
// every request but /healthz gets a generic 503, and the log names the
// variables (the response never does).
import { missingSettings } from '../../scripts/lib/settings.mjs'

export interface SettingsGuardOptions {
  env: Record<string, string | undefined>
  // The build's mode, which may not be set at runtime.
  mode: { DEPLOY_TARGET?: string; DB_ADAPTER?: string; STORAGE?: string }
  log?: (message: string) => void
}

export function createSettingsGuard({ env, mode, log = console.error }: SettingsGuardOptions) {
  let missing: string[] | undefined
  return (path: string): Response | null => {
    if (!missing) {
      missing = missingSettings({ ...env, ...mode })
      if (missing.length) log(`Missing required settings: ${missing.join(', ')} (see .env.example).`)
    }
    if (!missing.length || path === '/healthz') return null
    return new Response('Service unavailable', { status: 503, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' } })
  }
}
