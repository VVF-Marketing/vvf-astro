// Applies the marketing guard (src/lib/marketingGuard.ts) to EmDash's MCP
// endpoint and admin REST API. Runs from src/middleware.ts after EmDash's
// own middleware has authenticated the request (locals.user).
import type { APIContext, MiddlewareNext } from 'astro'
import {
  checkOperation,
  filterChildData,
  isRestricted,
  isSafeguardingUser,
  normalizeApiPath,
  restOperation,
  type Decision,
  type GuardContext,
  type GuardUser,
  type Operation,
} from './marketingGuard'

const API = '/_emdash/api/'

// Site routes (paths without /es), for menu link checks. Bundled at build time.
const PAGE_FILES = Object.keys(import.meta.glob('/src/pages/**/*.astro'))
const ROUTE_PATTERNS = PAGE_FILES.filter((f) => !/\/_[^/]*$/.test(f)).map((file) => {
  const route = file.replace(/^\/src\/pages/, '').replace(/\.astro$/, '').replace(/\/index$/, '') || '/'
  const source = route
    .split('/')
    .map((s) => (s.startsWith('[...') ? '.*' : s.startsWith('[') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
    .join('/')
  return new RegExp(`^${source || '/'}$`)
})

export function routeExists(path: string): boolean {
  return ROUTE_PATTERNS.some((r) => r.test(path))
}

function guardContext(context: APIContext, user: GuardUser): GuardContext {
  const emdash = (context.locals as { emdash?: any }).emdash
  return {
    safeguarding: isSafeguardingUser(user, import.meta.env.SAFEGUARDING_USERS ?? process.env.SAFEGUARDING_USERS),
    async lookup(collection, id, locale) {
      const res = await emdash?.handleContentGet(collection, id, locale)
      const item = res?.success ? res.data?.item : undefined
      return item ? { status: item.status, data: item.data ?? item } : undefined
    },
    async revisionCollection(revisionId) {
      const res = await emdash?.handleRevisionGet(revisionId)
      return res?.success ? res.data?.item?.collection : undefined
    },
    routeExists,
  }
}

const readsChildren = (op: Operation) =>
  (op.args.collection === 'children' && (op.tool === 'content_list' || op.tool === 'content_get')) || op.tool === 'search' || op.tool === 'dashboard'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

export async function guardEmDashApi(context: APIContext, next: MiddlewareNext): Promise<Response | undefined> {
  const { url, request } = context
  const path = normalizeApiPath(url.pathname)
  if (!path.startsWith(API)) return undefined
  // EmDash's database snapshot (every table, child profiles included) is
  // public to its auth middleware, which leaves the user unresolved here, so
  // it can't be guarded per role. A request with an invalid preview signature
  // falls back to the session user, and Editors may read it. The site doesn't
  // use preview services, so it's closed to everyone; `npm run data export`
  // covers full copies.
  if (path === `${API}snapshot`) {
    return json({ error: { code: 'FORBIDDEN_BY_POLICY', message: 'Snapshots are disabled on this site.' } }, 403)
  }
  const user = (context.locals as { user?: GuardUser }).user
  if (!isRestricted(user)) return undefined
  const ctx = guardContext(context, user!)
  return path === `${API}mcp` ? guardMcp(request, ctx, next) : guardRest(context, ctx, next)
}

// --- MCP (JSON-RPC over Streamable HTTP) ----------------------------------

interface RpcMessage {
  jsonrpc: '2.0'
  id?: string | number | null
  method?: string
  params?: { name?: string; arguments?: Record<string, any> }
}

async function guardMcp(request: Request, ctx: GuardContext, next: MiddlewareNext): Promise<Response> {
  if (request.method !== 'POST') return next()
  let body: RpcMessage | RpcMessage[]
  try {
    body = await request.clone().json()
  } catch {
    return next()
  }
  const messages = Array.isArray(body) ? body : [body]
  const decisions: [RpcMessage, Operation, Decision][] = []
  for (const msg of messages) {
    if (msg.method !== 'tools/call' || !msg.params?.name) continue
    const op = { tool: msg.params.name, args: msg.params.arguments ?? {} }
    decisions.push([msg, op, await checkOperation(op, ctx)])
  }

  const refused = decisions.filter(([, , d]) => !d.allow)
  if (refused.length) {
    // A refusal is reported as a tool error so the client can explain it.
    const replies = refused.map(([msg, , d]) => ({
      jsonrpc: '2.0',
      id: msg.id ?? null,
      result: { isError: true, content: [{ type: 'text', text: (d as { message: string }).message }] },
    }))
    return json(Array.isArray(body) ? replies : replies[0])
  }

  const response = await next()
  if (ctx.safeguarding || !decisions.some(([, op]) => readsChildren(op))) return response
  return filterMcpResponse(response)
}

// Tool results carry their payload as JSON text; filter child data inside.
async function filterMcpResponse(response: Response): Promise<Response> {
  const type = response.headers.get('content-type') ?? ''
  const text = await response.text()
  const filterMessage = (raw: string) => {
    const msg = JSON.parse(raw)
    for (const part of msg?.result?.content ?? []) {
      if (part.type !== 'text') continue
      try {
        part.text = JSON.stringify(filterChildData(JSON.parse(part.text), true))
      } catch {
        // Not JSON: leave as is.
      }
    }
    return JSON.stringify(msg)
  }
  const filtered = type.includes('text/event-stream')
    ? text.replace(/^data: (.*)$/gm, (_, raw: string) => `data: ${filterMessage(raw)}`)
    : filterMessage(text)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(filtered, { status: response.status, headers })
}

// --- Admin REST API --------------------------------------------------------

async function guardRest(context: APIContext, ctx: GuardContext, next: MiddlewareNext): Promise<Response> {
  const { request, url } = context
  // EmDash parses bodies as JSON whatever their Content-Type, so the guard
  // does too, and refuses a body it can't read rather than checking nothing.
  let body: Record<string, any> | undefined
  let unreadable = false
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const text = await request.clone().text()
    if (text.trim()) {
      try {
        body = JSON.parse(text)
      } catch {
        unreadable = true
      }
    }
  }
  const op = restOperation(request.method, url.pathname, body, url.searchParams)
  if (!op) return next()
  if (unreadable) return json({ error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } }, 400)
  const decision = await checkOperation(op, ctx)
  if (decision.allow === false) {
    const status = decision.status ?? 403
    return json({ error: { code: status === 404 ? 'NOT_FOUND' : 'FORBIDDEN_BY_POLICY', message: decision.message } }, status)
  }
  const response = await next()
  if (ctx.safeguarding || !readsChildren(op) || !(response.headers.get('content-type') ?? '').includes('json')) return response
  const filtered = filterChildData(await response.json(), true)
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  return new Response(JSON.stringify(filtered), { status: response.status, headers })
}
