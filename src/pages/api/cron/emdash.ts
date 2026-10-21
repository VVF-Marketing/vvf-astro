// Scheduled work on Vercel (openspec/changes/run-on-vercel-functions, D3):
// Vercel Cron calls this every 5 minutes (vercel.json) with CRON_SECRET, and
// it runs EmDash's scheduled publishing, plugin cron and cleanup. The Node
// server drives the same work from EmDash's in-process timer instead.
import type { APIRoute } from 'astro'
import { CRON_SECRET } from 'astro:env/server'
import { runScheduledTasks } from 'emdash/middleware'
import { handleCron } from '../../../lib/protectedEndpoints'

export const prerender = false

export const GET: APIRoute = ({ request }) => handleCron(request, { secret: CRON_SECRET, run: () => runScheduledTasks() })
