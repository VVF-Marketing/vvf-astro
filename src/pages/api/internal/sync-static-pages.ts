// The deploy pipeline's static-page sync (openspec/changes/
// run-on-vercel-functions, D5): called once right after a deploy, with the
// sync's own token (EMDASH_SYNC_PAT), so the first visitor never waits on it
// and a failed sync fails the deploy job.
import type { APIRoute } from 'astro'
import { EMDASH_SYNC_PAT, VERCEL_AUTOMATION_BYPASS_SECRET } from 'astro:env/server'
import { handleSync } from '../../../lib/protectedEndpoints'
import { runStaticPageSync } from '../../../lib/staticPageSyncRunner'

export const prerender = false

export const POST: APIRoute = ({ request, url }) =>
  handleSync(request, {
    secret: EMDASH_SYNC_PAT,
    run: () => runStaticPageSync({ baseUrl: url.origin, token: EMDASH_SYNC_PAT!, bypassSecret: VERCEL_AUTOMATION_BYPASS_SECRET, force: true }),
  })
