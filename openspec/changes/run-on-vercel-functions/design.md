## Context

See proposal.md (Why). What the code does today, and what EmDash 0.38 does, as read from its source:

- **Adapter and config:** `astro.config.mjs` has `output: 'server'` and `adapter: node({ mode: 'standalone' })`. `DB_ADAPTER=postgres` / `STORAGE=s3` at build pick the Postgres dialect (runtime entrypoint `src/lib/db/postgresRuntime.mjs`) and EmDash's `s3()` storage. Sessions use `src/lib/db/sessionDriver.mjs` (db0 + `pg`) in Postgres mode.
- **Launcher:** `scripts/start.mjs` runs `missingSettings()` and then imports `dist/server/entry.mjs`. Only the Dockerfile's `CMD` uses it.
- **EmDash scheduler** (`emdash/src/astro/integration/virtual-modules.ts`, `generateSchedulerModule`):
  - `virtual:emdash/scheduler` exports `createScheduler = null` only for an `@astrojs/cloudflare` build;
  - every other adapter gets a `NodeCronScheduler` (an in-process timer) that runs scheduled publishing, plugin cron and cleanup;
  - `runScheduledTasks(config, options)` is exported from `emdash/middleware` for request-less callers. A second sweep is a no-op (`scheduled-publish.ts`: `publish()` clears `scheduled_at`).
- **EmDash `after()`** (`emdash/src/after.ts`): it hands the promise to `waitUntil` from `virtual:emdash/wait-until`. That module only exports one for Cloudflare. Everywhere else the work is fired and forgotten, on the assumption that "the process lives for the next request anyway".
- **Static-page sync** (`src/middleware.ts`):
  - a module-level `hasSynced` flag plus a `globalThis.__staticPageSync` promise chain run `syncStaticPages` once per process, through `after()`;
  - it calls the CMS API at `context.url.origin` with `EMDASH_SYNC_PAT`;
  - overlapping runs in one process are serialised, but nothing coordinates across processes.
- **Postgres:** EmDash's `createDialect` (`emdash/db/postgres`) creates a `pg` pool from `connectionString` (it also accepts `pool` options). The session driver creates a second pool through db0. `scripts/db-setup.mjs` runs `npx emdash migrate --from-config` with `DATABASE_URL`.
- **Redirects:** `legacyRoutes.mjs` feeds Astro `redirects` with explicit 301/302 statuses. The e2e suite checks them against the Node server.
- **Vercel facts** (Pro plan):
  - functions on the Node.js runtime, Fluid compute;
  - 250 MB unzipped bundle limit;
  - 4.5 MB request/response body limit (relevant to media; see `store-media-in-vercel-blob`);
  - Vercel Cron down to once a minute, sending `Authorization: Bearer $CRON_SECRET`;
  - `waitUntil` and `attachDatabasePool` from `@vercel/functions`;
  - `VERCEL_DEPLOYMENT_ID` set at runtime.
- **Neon (Vercel Marketplace):** injects `DATABASE_URL` (pooled, `-pooler` host) and `DATABASE_URL_UNPOOLED` (direct), with `sslmode=require` in the URLs.

## Goals / Non-Goals

**Goals:**
- One Vercel build that serves the full site and CMS correctly on functions.
- Background and scheduled work that doesn't depend on a long-lived process.
- No behaviour change for `npm run dev`, the Docker image or its CI job.

**Non-Goals:**
- Media on Vercel Blob (`store-media-in-vercel-blob`). Until that lands, a Vercel deployment can use the existing `STORAGE=s3` against any S3-compatible bucket, which is enough for the spike.
- GitHub Actions, previews, domains and production data (`add-vercel-deploy-pipeline`, `move-production-to-vercel`).
- The Edge runtime: `pg`, `sharp` and EmDash's Node-only modules rule it out.
- Upgrading EmDash to 1.x. It has the same Cloudflare-only scheduler check, so upgrading wouldn't remove D3/D4.

## Decisions

### D0. Spike first
Deploy a throwaway Vercel project from a branch with `DEPLOY_TARGET=vercel`, a Neon database seeded with the public seed (`npm run db:setup`), and an S3-compatible bucket. Answer:
1. Does `@astrojs/vercel` bundle EmDash's admin, `pg` and `sharp` under the 250 MB limit? Check the size reported by `vercel build` and whether `includeFiles` or `excludeFiles` are needed, e.g. for EmDash's admin assets or the AWS SDK.
2. Do Astro redirects come out as 301/302 in `.vercel/output/config.json`, or as 308? Does the `/es` rewrite in `src/middleware.ts` work?
3. Do the Vite aliases for `virtual:emdash/scheduler` and `virtual:emdash/wait-until` (D3, D4) take effect in the Vercel build? Or does EmDash's own Vite plugin win, which would mean an upstream patch or `patch-package`?
4. Does EmDash's admin sign-in work with db0 sessions on functions: a magic-link sign-in followed by requests landing on different instances?
5. Cold-start time of the main function, and whether the static-page sync (D5) is done inside one `waitUntil` window.

Record the answers here before the rest is built. Adjust later tasks, and check with the user if an answer changes the scope.

### D1. A build-time target switch
`astro.config.mjs` reads `DEPLOY_TARGET`:
- `vercel` → `adapter: vercel({ /* Node runtime defaults */ })`;
- anything else → `node({ mode: 'standalone' })`.

The region is set in `vercel.json` (`regions: ["iad1"]`, matching Neon's `us-east-1`; confirmed against the Neon project's region in `move-production-to-vercel`). It mirrors the existing `DB_ADAPTER`/`STORAGE` switches: the build picks the adapter, and the runtime supplies the connection.

**Rejected:** autodetecting Vercel from `VERCEL=1`. It's set during Vercel builds but also in `vercel dev` and `vercel env pull` shells, and an explicit switch is easier to see in CI logs.

### D2. Required settings without a launcher
`missingSettings(env)` moves from `scripts/start.mjs` to `src/lib/settings.mjs`. `start.mjs` imports it and behaves as before. On the Vercel target, `src/middleware.ts` runs the check once per instance:
- when something is missing, it logs `Missing required settings: <names>` and answers 503 for every path except `/healthz`;
- the response body is generic, like `/readyz`'s.

The pipeline (`add-vercel-deploy-pipeline`) runs the same function against `vercel env pull` output before deploying.

**Rejected:**
- making the variables required in `astro:env`: Astro checks required secrets at build too (found in `make-app-portable` D1), so the CI build would need production secrets;
- failing the function at import: Vercel would show a generic 500 and a crash loop instead of a named variable.

### D3. Scheduled work from Vercel Cron
- **The endpoint:** `src/pages/api/cron/emdash.ts` (`prerender = false`, no-store, not localized, not in the sitemap) checks `Authorization: Bearer ${CRON_SECRET}` and then calls `runScheduledTasks(config)` from `emdash/middleware`. It answers `{ ok: true }` or 500 with no detail. The error name goes to the log, as `src/lib/health.ts` does.
- **The schedule:** `vercel.json` `crons: [{ path: "/api/cron/emdash", schedule: "*/5 * * * *" }]`. Vercel Pro allows every minute; 5 minutes is enough for scheduled posts and keeps invocations low.
- **The in-process timer:** on the Vercel target, a Vite `resolve.alias` (set in `astro.config.mjs` only when `DEPLOY_TARGET=vercel`) points `virtual:emdash/scheduler` at `src/lib/vercel/scheduler.mjs`, which exports `createScheduler = null`. This is the same thing EmDash's Cloudflare branch does.
- **Fallback if the spike shows EmDash's plugin wins:** a `patch-package` patch adding `@astrojs/vercel` to the serverless check in `generateSchedulerModule`, plus an upstream issue or PR. Overlapping runs are safe (the spec's "Overlapping runs" scenario): scheduled publishing is idempotent, and plugin cron uses EmDash's own claim and lease in the database.
- **Why the recap reminder matters:** the `recap-reminder` plugin's email "waits on hosting" (spec 7.8). This makes its cron run on Vercel. Sending the email itself is out of scope.

**Rejected:**
- leaving the in-process timer on: frozen instances fire it at random times, and every instance would sweep;
- GitHub Actions `schedule`: it's less reliable (delays of 10+ minutes) and needs the secret outside Vercel.

### D4. `waitUntil` for deferred work
Same mechanism as D3: on the Vercel target, `virtual:emdash/wait-until` is aliased to `src/lib/vercel/waitUntil.mjs`, which re-exports `waitUntil` from `@vercel/functions`. EmDash's `after()` and the site's own uses (the static-page sync) are then kept alive until they finish.

### D5. Static-page sync once per deployment
- **The marker:** EmDash's options table (or a one-row `site_sync` table) stores the deployment ID of the last successful sync: `VERCEL_DEPLOYMENT_ID` on Vercel, and the build's `buildTime` from `virtual:emdash/build` elsewhere.
- **On the first request of an instance:**
  - if the marker matches, it skips;
  - otherwise it takes a Postgres advisory lock (`pg_try_advisory_lock`), re-checks, syncs and writes the marker;
  - an instance that doesn't get the lock skips, because the holder is syncing.

  On SQLite (dev) the existing per-process behaviour stays: one process, nothing to coordinate.
- **Pipeline trigger:** `POST /api/internal/sync-static-pages`, authorised with `EMDASH_SYNC_PAT` as a Bearer token, runs the same guarded sync and answers with the sync's counts. The pipeline calls it right after a deploy. Preview deployments behind Deployment Protection need the `x-vercel-protection-bypass` header. Then the first real visitor never pays for it, and a failed sync fails the deploy job instead of only being logged.
- **The sync's own calls** go to `context.url.origin`. On a protected preview, the sync adds the bypass header when `VERCEL_AUTOMATION_BYPASS_SECRET` is set, which Vercel provides when Protection Bypass for Automation is enabled.

**Rejected:**
- a build-time sync: the build has no running server, and on previews no database yet;
- per-process only: on Vercel that means many concurrent syncs per deploy.

### D6. Postgres on functions
- **URLs:** `databaseUrl()` keeps reading `DATABASE_URL`, which is the pooled URL from the Neon integration. A new `directDatabaseUrl()` reads `DATABASE_URL_UNPOOLED` and falls back to `DATABASE_URL`. `scripts/db-setup.mjs` and `scripts/data.mjs` use the direct URL for `emdash migrate` and imports, because PgBouncer transaction pooling breaks advisory locks and session settings that migrations use.
- **Pool sizes:**
  - the EmDash dialect gets `pool: { max: Number(env.DATABASE_POOL_MAX ?? 5), idleTimeoutMillis: 10_000 }`;
  - the session driver gets `max: 2`;
  - on the Vercel target both pools are passed to `attachDatabasePool`, so Fluid compute closes idle clients before an instance is frozen.
- **SSL:** Neon URLs carry `sslmode=require`, which `pg` honours. `DATABASE_SSL` stays as an override.

**Rejected:** Neon's HTTP driver (`@neondatabase/serverless`). EmDash's dialect is `pg`/Kysely, and swapping drivers would fork EmDash's Postgres support.

### D7. Bundle and redirects (from the spike)
If D0 finds 308s, set each redirect's status explicitly in the Vercel adapter's output (the adapter's `redirects` option, or moving `STATIC_REDIRECTS` into `vercel.json` `redirects` with `statusCode`). Keep `legacyRoutes.mjs` as the single source, with a generator or check script so the two can't drift. If the bundle is over the limit, exclude the AWS SDK from the Vercel bundle once Blob replaces S3 (`store-media-in-vercel-blob`), and record the measured size here.

## Risks / Trade-offs

- **[Aliasing EmDash's virtual modules depends on EmDash internals]** → D0 proves it works. A unit test asserts the built server chunk for the Vercel target has no `NodeCronScheduler` and imports `@vercel/functions`. On EmDash upgrades the test fails loudly. Upstream support for a serverless flag is the long-term fix.
- **[Cron runs every 5 minutes, not at the exact scheduled time]** → Up to 5 minutes' delay for scheduled posts. The spec states it; it can go to 1 minute on Pro if editors need it.
- **[Advisory locks need a direct-ish connection]** → `pg_try_advisory_lock` is session-scoped. Over the PgBouncer pooled URL it must run lock, work and unlock on one client in one transaction (`pg_try_advisory_xact_lock`). The design uses the transaction-scoped lock.
- **[Two pools per instance]** → Sizes are capped and attached to Fluid compute. Neon's pooler absorbs the rest (thousands of client connections).
- **[Vercel and container targets drift]** → The container CI job stays. The pipeline change adds e2e against each Vercel preview, so both targets are tested on every PR.

## Migration Plan

Nothing changes until a Vercel project is created (in `add-vercel-deploy-pipeline`). Local development, the Docker image and CI behave as before. Rollback means not deploying to Vercel. Every change here is inert without `DEPLOY_TARGET=vercel`, except:
- the shared `missingSettings` module and the pool sizes, both covered by unit tests;
- the sync marker, which also applies to the container (one sync per build instead of per process; no behaviour change for a single container).

## Open Questions

- Should the cron schedule be every minute for scheduled posts? This is a one-line `vercel.json` change, to decide with the editors.
