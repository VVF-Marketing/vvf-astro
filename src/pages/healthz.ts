// Liveness: the server process is up (Dockerfile HEALTHCHECK). No database
// or storage calls, no localization (src/middleware.ts skips it).
import type { APIRoute } from 'astro'
import { NO_STORE } from '../lib/health'

export const prerender = false

export const GET: APIRoute = () => new Response('ok', { headers: { ...NO_STORE, 'Content-Type': 'text/plain' } })
