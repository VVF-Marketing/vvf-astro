## Context

See proposal.md (Why). What the code does today, and what EmDash 0.38 does, as read from its source:

- **Adapter and config:** `astro.config.mjs` has `output: 'server'` and `adapter: node({ mode: 'standalone' })`. `DB_ADAPTER=postgres` / `STORAGE=s3` at build pick the Postgres dialect (runtime entrypoint `src/lib/db/postgresRuntime.mjs`) and EmDash's `s3()` storage. Sessions use `src/lib/db/sessionDriver.mjs` (db0 + `pg`) in Postgres mode.
- **Launcher:** `scripts/start.mjs` runs `missingSettings()` and then imports `dist/server/entry.mjs`. Only the Dockerfile's `CMD` uses it.
- **EmDash scheduler** (`emdash/src/astro/integration/virtual-modules.ts`, `generateSchedulerModule`):
  - `virtual:emdash/scheduler` exports `createScheduler = null` only for an `@astrojs/cloudflare` build;
  - every other adapter gets a `NodeCronScheduler` (an in-process timer) that runs scheduled publishing, plugin cron and cleanup;
  - `runScheduledTasks(options)` is exported from `emdash/middleware` for request-less callers. A second sweep is a no-op (`scheduled-publish.ts`: `publish()` clears `scheduled_at`).
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
3. Do the overrides for `virtual:emdash/scheduler` and `virtual:emdash/wait-until` (D3, D4) take effect in the Vercel build? Or does EmDash's own Vite plugin win, which would mean an upstream patch or `patch-package`?
4. Does EmDash's admin sign-in work with db0 sessions on functions: a magic-link sign-in followed by requests landing on different instances?
5. Cold-start time of the main function, and whether the static-page sync (D5) is done inside one `waitUntil` window.

Record the answers here before the rest is built. Adjust later tasks, and check with the user if an answer changes the scope.

**Local spike results (2026-10-21, `@astrojs/vercel` 11.0.16, EmDash 0.38, `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=s3 npx astro build`):**
- **(1) Bundle size:** `.vercel/output` has one function, `_render.func` (`nodejs22.x`, response streaming on), at **48 MB** unzipped, plus 33 MB of static files. That's well under the 250 MB limit; no `includeFiles` or `excludeFiles` needed.
- **(2) Redirects:** all 126 legacy redirects from `legacyRoutes.mjs` come out in `config.json` as routes with `status: 301` and the right `Location`. There are no 308s, so D7's fix isn't needed; a build-output test guards it (task 7.1). The `/es` rewrite runs in Astro's middleware inside the function, the same as on Node.
- **(3) Overrides:** an `enforce: 'pre'` Vite plugin (`src/lib/vercel/vitePlugin.mjs`) answers both virtual modules before EmDash's plugin, which works more predictably than a `resolve.alias`. The bundled middleware passes `createScheduler: null`, and the wait-until chunk is `export { waitUntil } from "@vercel/functions"`. `NodeCronScheduler`'s class is still bundled, because EmDash's index exports it, but it's never instantiated. No upstream patch is needed.
- **(4) Cross-instance sign-in** and **(5) cold start and sync duration** need a live deployment (task 9.1). This session's network can't reach Vercel.

**Live spike results (2026-10-22, project `vvf-astro-spike` on the foundation's Vercel Pro team, Neon free plan in `iad1`, public seed via `npm run db:setup -- --yes`, `STORAGE=local`, so no media):**
- **No media on purpose.** There's no S3 bucket; Blob is the next change and gets its own spike (`store-media-in-vercel-blob` 1.1). Media rows exist, the files don't, so images and PDFs 404 on the spike.
- **(4) Sign-in:** first-run setup and passkey sign-in worked, and the admin stayed signed in while its requests spread across instances.
- **(5) Cold start:** 1.6–2.6 s for the first request to a new instance; warm pages 0.2–0.5 s. **Sync:** about 8 s from the first request to the logged counts, inside one `waitUntil` (44 pages created on the first deployment, 44 updated on the next).
- **The cron is lost by `astro build`.** The first deployments were `astro build` + `vercel deploy --prebuilt`, and `/api/cron/emdash` was never called: `astro build` writes `.vercel/output/config.json` without `vercel.json`'s `crons`, and a prebuilt deploy reads only that file. `vercel build` copies them. Rebuilt with `vercel build`, the first cron run (01:35:40 UTC) published an entry scheduled for 01:30. `scripts/vercel-build.test.mjs` now fails when the crons are missing, and CI builds the target with `vercel build`. The pipeline (`add-vercel-deploy-pipeline`) already plans on `vercel build`.
- **Protected deployment URLs need the bypass.** Something requests each new deployment's own URL right after deploy. Before *Protection Bypass for Automation* was on, the sync started there failed with `EmDashApiError: Protected deployment`, and the public alias's first request synced instead. With the bypass on, the sync ran on the protected URL.
- **Runtime follows the build machine's Node.** `.vc-config.json` said `nodejs24.x` on a Node 26 laptop; CI builds on Node 22 (`nodejs22.x`). Prebuilt output carries no region either: the function ran in `iad1` because that's the project default.
- **Five concurrent first requests** to a fresh deployment: all 200, one sync, no duplicate `pages` or copy rows (keyed by `route_path`/`key` and locale; `slug` is null for both).
- **Load:** `autocannon -c 50 -a 200`: 200 × 200, no connection errors, no re-sync (instances logged `busy` or `already-synced`). Latency p50 1.1 s, p97.5 4.9 s, from about 50 instances starting at once.
- **e2e** (`playwright.container.config.ts` against the public alias, from a laptop): 698 passed, 19 skipped, 50 failed. None is a Vercel problem. 9 were timeouts under load and passed on a 2-worker rerun. 36 need child data, which the public seed doesn't have (the list, the carousel, profile pages, the 80 legacy child URLs). 1 needs media (the PDF download gets the media route's JSON error). `drafts.spec` picked up a local token that isn't valid there. With a 3-minute timeout, two of the three whole-sitemap crawls pass; the third fails only on those child URLs. Open: `/es/events/2025-golf-tournament` scrolls 97 px sideways at 1280 px, from a broken (media-less) photo; recheck once media works.
- **Found while building:** `astro build` fetches Google Fonts, and a blocked fetch is only a warning ("No data found for font family Noto Sans"), not a failure.

### D1. A build-time target switch
`astro.config.mjs` reads `DEPLOY_TARGET`:
- `vercel` → `adapter: vercel({ /* Node runtime defaults */ })`;
- anything else → `node({ mode: 'standalone' })`.

The region is set in `vercel.json` (`regions: ["iad1"]`, matching Neon's `us-east-1`; confirmed against the Neon project's region in `move-production-to-vercel`). It mirrors the existing `DB_ADAPTER`/`STORAGE` switches: the build picks the adapter, and the runtime supplies the connection.

**Rejected:** autodetecting Vercel from `VERCEL=1`. It's set during Vercel builds but also in `vercel dev` and `vercel env pull` shells, and an explicit switch is easier to see in CI logs.

### D2. Required settings without a launcher
`missingSettings(env)` moves from `scripts/start.mjs` to `scripts/lib/settings.mjs`. `start.mjs` imports it and behaves as before. On the Vercel target, `src/middleware.ts` runs the check once per instance:
- when something is missing, it logs `Missing required settings: <names>` and answers 503 for every path except `/healthz`;
- the response body is generic, like `/readyz`'s;
- on the Vercel target, `CRON_SECRET` and `EMDASH_SYNC_PAT` are required too. Nothing else runs scheduled publishing or the sync there, so without them both would stop silently (cron calls get 401, the sync is skipped). From Eduardo's review on #32.

The pipeline (`add-vercel-deploy-pipeline`) runs the same function against `vercel env pull` output before deploying.

**Rejected:**
- making the variables required in `astro:env`: Astro checks required secrets at build too (found in `make-app-portable` D1), so the CI build would need production secrets;
- failing the function at import: Vercel would show a generic 500 and a crash loop instead of a named variable.

### D3. Scheduled work from Vercel Cron
- **The endpoint:** `src/pages/api/cron/emdash.ts` (`prerender = false`, no-store, not localized, not in the sitemap) checks `Authorization: Bearer ${CRON_SECRET}` and then calls `runScheduledTasks()` from `emdash/middleware` (it resolves the config itself). It answers `{ ok: true }` or 500 with no detail. The error name goes to the log, as `src/lib/health.ts` does.
- **The schedule:** `vercel.json` `crons: [{ path: "/api/cron/emdash", schedule: "*/5 * * * *" }]`. Vercel Pro allows every minute; 5 minutes is enough for scheduled posts and keeps invocations low.
- **The in-process timer:** on the Vercel target, a Vite plugin (`src/lib/vercel/vitePlugin.mjs`, `enforce: 'pre'`, added in `astro.config.mjs` only when `DEPLOY_TARGET=vercel`) answers `virtual:emdash/scheduler` with `createScheduler = null`. That's the same thing EmDash's Cloudflare branch does. The spike chose a plugin over a `resolve.alias` because it runs before EmDash's own `resolveId` for certain.
- **Fallback, not needed (D0):** a `patch-package` patch adding `@astrojs/vercel` to the serverless check in `generateSchedulerModule`, plus an upstream issue or PR. Overlapping runs are safe (the spec's "Overlapping runs" scenario): scheduled publishing is idempotent, and plugin cron uses EmDash's own claim and lease in the database.
- **Why the recap reminder matters:** the `recap-reminder` plugin's email "waits on hosting" (spec 7.8). This makes its cron run on Vercel. Sending the email itself is out of scope.

**Rejected:**
- leaving the in-process timer on: frozen instances fire it at random times, and every instance would sweep;
- GitHub Actions `schedule`: it's less reliable (delays of 10+ minutes) and needs the secret outside Vercel.

### D4. `waitUntil` for deferred work
Same mechanism as D3: on the Vercel target, the same plugin answers `virtual:emdash/wait-until` with a re-export of `waitUntil` from `@vercel/functions`. EmDash's `after()` and the site's own uses (the static-page sync) are then kept alive until they finish.

### D5. Static-page sync once per deployment
- **The marker:** EmDash's options table (or a one-row `site_sync` table) stores the deployment ID of the last successful sync: `VERCEL_DEPLOYMENT_ID` on Vercel, and the build's `buildTime` from `virtual:emdash/build` elsewhere.
- **On the first request of an instance:**
  - if the marker matches, it skips;
  - otherwise it takes a Postgres advisory lock (`pg_try_advisory_lock`), re-checks, syncs and writes the marker;
  - an instance that doesn't get the lock skips, because the holder is syncing.

  On SQLite (dev) the existing per-process behaviour stays: one process, nothing to coordinate.
- **Pipeline trigger:** `POST /api/internal/sync-static-pages`, authorised with `EMDASH_SYNC_PAT` as a Bearer token, runs the same guarded sync and answers with the sync's counts (200), or 202 when another instance holds the lock. The pipeline calls it right after a deploy and retries a 202 until it gets 200, with a time limit (a 202 isn't success). The `/es/` copies of this endpoint and of `/api/cron/emdash` answer 404, like the health endpoints. Preview deployments behind Deployment Protection need the `x-vercel-protection-bypass` header. Then the first real visitor never pays for it, and a failed sync fails the deploy job instead of only being logged.
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

**Spike outcome:** neither applies. Redirects keep their 301s, and the function is 48 MB (D0). `scripts/vercel-build.test.mjs` checks both on every Vercel build: every redirect's status and destination, and the function under 250 MB. The CI container job builds the Vercel target and runs it.

### Found while implementing
- **db0's Postgres connector would have broken sign-ins on Vercel.** It opens one `pg.Client` and keeps it for the life of the process. When that connection drops, for example while an instance is frozen, every later session read fails with "Client has encountered a connection error and is not queryable" until the instance is recycled. `src/lib/db/sessionDriver.mjs` now gives db0 a `Client` that runs each query on a 2-connection pool, through the connector's `lib` option, so db0's parameter handling is kept. `src/lib/db/sessionDriver.integration.test.ts` terminates the driver's connections between two reads. It fails with db0's own client and passes with the pooled one.
- **`missingSettings` lives in `scripts/lib/settings.mjs`.** The container image copies only the launcher from `scripts/` and has no `src/`. So the shared module sits next to the launcher (one more `COPY` line in the Dockerfile), and the middleware's guard (`src/lib/settingsGuard.ts`) imports it from there.
- **The site makes its own Postgres pool.** EmDash's `createDialect` keeps its pool private, so it can't be passed to `attachDatabasePool`. `src/lib/db/postgresRuntime.mjs` builds the same thing EmDash does, a `pg` pool plus `FailFastPostgresDialect` from `emdash/database/pg-migration-lock`, logs pool errors by code only, and attaches the pool only when `VERCEL` is set, because outside a Vercel request `attachDatabasePool` only warns.
- **The build's mode reaches runtime code through `vite.define`.** `import.meta.env.DEPLOY_TARGET`, `DB_ADAPTER`, `STORAGE` and `BUILD_ID` are inlined at build (typed in `src/env.d.ts`). The middleware's guard and the sync runner know the mode even where those variables aren't set at runtime, as on Vercel, and `BUILD_ID` gives the container a per-build sync marker.
- **Concurrent first requests can see "busy" instead of "already synced".** The marker is read under the lock, so an instance that arrives while another is reading it skips as `busy`. Either way it doesn't sync. The pipeline's endpoint answers 202 in that case, because the other holder is syncing the same deployment.
- **The sitemap can't list the new endpoints.** It's built from copy manifests (`src/lib/sitemap.ts`), and endpoints never have one. `e2e/platform-endpoints.spec.ts` checks it anyway, next to the 401 checks.

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
