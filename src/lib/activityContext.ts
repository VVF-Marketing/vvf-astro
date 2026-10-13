// Who is behind the current EmDash API request, and through which channel,
// for the activity log plugin (src/plugins/activityLog.ts). EmDash's publish
// hooks don't say who published; src/middleware.ts runs every API request
// inside this context, and the hooks (deferred with promises, so the context
// carries over) read it back.
import { AsyncLocalStorage } from 'node:async_hooks'

export type ActivityChannel = 'mcp' | 'api' | 'admin'

export interface ActivityActor {
  user?: { id: string; email: string; name?: string | null }
  channel: ActivityChannel
}

// One instance per process, even if the bundler duplicates this module
// between the middleware and the plugin chunks.
const KEY = Symbol.for('vvf:activity-context')
const holder = globalThis as typeof globalThis & { [KEY]?: AsyncLocalStorage<ActivityActor> }
const storage = (holder[KEY] ??= new AsyncLocalStorage<ActivityActor>())

export const runWithActivityActor = <T>(actor: ActivityActor, fn: () => T): T => storage.run(actor, fn)
export const currentActivityActor = (): ActivityActor | undefined => storage.getStore()

// MCP is the marketing team's AI assistants; any other bearer token is a
// script or integration; a browser session is a person in the admin.
export function activityChannel(apiPath: string, headers: Headers): ActivityChannel {
  if (apiPath === '/_emdash/api/mcp') return 'mcp'
  return /^bearer\s/i.test(headers.get('authorization') ?? '') ? 'api' : 'admin'
}
