// Vite plugin for the Vercel build target (openspec/changes/run-on-vercel-functions,
// design D3/D4). EmDash generates two virtual modules from the Astro adapter's
// name and only treats @astrojs/cloudflare as serverless, so under
// @astrojs/vercel it would start an in-process cron timer and fire-and-forget
// deferred work. This plugin answers both modules first (enforce: 'pre'):
// - virtual:emdash/scheduler: no timer; Vercel Cron calls /api/cron/emdash.
// - virtual:emdash/wait-until: Vercel's waitUntil, so after() work finishes.
const MODULES = {
  'virtual:emdash/scheduler': `// Vercel build: Vercel Cron drives scheduled work (/api/cron/emdash).
export const createScheduler = null;
`,
  'virtual:emdash/wait-until': `// Vercel build: keep deferred work alive past the response.
export { waitUntil } from '@vercel/functions';
`,
}

const PREFIX = '\0vvf-vercel:'

export function vercelRuntime() {
  return {
    name: 'vvf:vercel-runtime',
    enforce: 'pre',
    resolveId(id) {
      return id in MODULES ? PREFIX + id : null
    },
    load(id) {
      return id.startsWith(PREFIX) ? MODULES[id.slice(PREFIX.length)] : null
    },
  }
}
