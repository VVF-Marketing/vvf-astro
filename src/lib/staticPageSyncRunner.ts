// Runs the static-page sync for this deployment (openspec/changes/
// run-on-vercel-functions, design D5): from the middleware on an instance's
// first request, and from POST /api/internal/sync-static-pages after a deploy.
import { getDb } from 'emdash/runtime'
import type { Kysely } from 'kysely'
import type { CopyManifest } from './copy'
import { syncOncePerDeployment } from './deploymentSync'
import { manifestSources, pageFilesFromGlob, syncStaticPages } from './staticPageSync'
import { protectionBypassHeaders } from './vercel/protectionBypass'

// Copy slot manifests (src/lib/copy.ts): one `_copy.ts` per page, a
// `_copy.detail.ts` per collection detail template, plus the site-wide one.
// Bundled at build time, so the deployed server has them too.
const COPY_MANIFESTS = import.meta.glob<{ default: CopyManifest | CopyManifest[] }>(
  ['/src/pages/**/_copy.ts', '/src/pages/**/_copy.detail.ts', '/src/copy/_copy.ts'],
  { eager: true }
)

// Every page file, resolved at build time (keys only; nothing is imported),
// so the sync needs no src/ directory at runtime (make-app-portable, D5).
const PAGE_FILES = pageFilesFromGlob(Object.keys(import.meta.glob('/src/pages/**/*.astro')))

// Vercel's deployment, or this build (one sync per image on the container).
const deploymentId = () => process.env.VERCEL_DEPLOYMENT_ID || import.meta.env.BUILD_ID

export interface RunStaticPageSyncOptions {
  baseUrl: string
  token: string
  bypassSecret?: string
  force?: boolean
}

export async function runStaticPageSync({ baseUrl, token, bypassSecret, force }: RunStaticPageSyncOptions) {
  // Coordinated on Postgres; SQLite (local dev) is one process.
  const db = import.meta.env.DB_ADAPTER === 'postgres' ? ((await getDb()) as unknown as Kysely<any>) : undefined
  return syncOncePerDeployment({
    db,
    deploymentId: deploymentId(),
    force,
    sync: () =>
      syncStaticPages({
        baseUrl,
        token,
        headers: protectionBypassHeaders(bypassSecret),
        pageFiles: PAGE_FILES,
        manifests: manifestSources(COPY_MANIFESTS, PAGE_FILES),
      }),
  })
}
