## Why

The foundation will host the site on Vercel (Pro plan), with its data in Vercel too: Neon Postgres through the Vercel Marketplace and Vercel Blob for media. `make-app-portable` made the app host-neutral, but it still assumes **one long-lived Node server**, and Vercel runs it as short-lived functions:

- **The Node adapter is hard-coded.** `astro.config.mjs` builds with `@astrojs/node` standalone, and `scripts/start.mjs` (the launcher that checks required settings) never runs on Vercel.
- **EmDash's background work assumes a process that stays up.** EmDash 0.38 treats every adapter except Cloudflare as long-lived (`generateSchedulerModule`, `generateWaitUntilModule` in its integration). On Vercel:
  - an in-process timer would drive scheduled publishing, plugin cron (the recap reminder) and cleanup, and functions don't keep timers alive;
  - `after()` work (the static-page sync, activity bookkeeping) is fired and forgotten, so it can be cut off when the function freezes.
- **The static-page sync runs on every cold start.** `src/middleware.ts` syncs on the first request of each process. On Vercel every new instance is a new process, and overlapping runs can create duplicate rows (see the comment on `syncState`).
- **Serverless Postgres connections need care.** Each instance opens two pools: EmDash's dialect and the db0 session driver. Neon expects pooled connections at runtime and a direct connection for migrations.

This change makes the site run correctly on Vercel functions. Media (`store-media-in-vercel-blob`), the deploy pipeline (`add-vercel-deploy-pipeline`) and the production cutover (`move-production-to-vercel`) are follow-up changes that build on it.

Basecamp card: _link the "Tareas" card for hosting here when the change is started (`basecamp cards list -p 43742602`)._

## What Changes

- **Vercel build target:** `DEPLOY_TARGET=vercel` at build selects `@astrojs/vercel` (Node.js runtime, one region next to the database). Without it, the build stays on `@astrojs/node`, so local development, the Docker image and its CI job are unchanged.
- **Required settings checked without a launcher:**
  - on Vercel, a missing required setting makes every request answer 503 and logs the variable's name;
  - the same check (`missingSettings`) is exported for the pipeline to run before deploying.
- **Scheduled work from Vercel Cron:**
  - a protected endpoint runs EmDash's scheduled tasks (scheduled publishing, plugin cron, cleanup), and Vercel Cron calls it every few minutes;
  - the in-process timer is turned off on the Vercel target.
- **Deferred work survives the response:** EmDash's `after()` uses Vercel's `waitUntil` on the Vercel target.
- **Static-page sync once per deployment:**
  - the sync runs once for each deployment, not once per instance;
  - the pipeline triggers it through a protected endpoint, and the first-request path stays as a fallback;
  - concurrent runs can't duplicate rows.
- **Serverless-safe Postgres:**
  - pooled URL at runtime, direct URL for migrations and setup;
  - small pools that close when idle;
  - Neon's Marketplace variable names accepted.
- **Verified on Vercel:**
  - legacy redirect status codes (301/302) and the `/es` routing behave as on Node;
  - the server bundle fits the function size limit.

## Capabilities

### New Capabilities
- `vercel-hosting`: how the site runs on Vercel functions. Covers the build target, how required settings are enforced without a launcher, scheduled work driven by Vercel Cron, deferred work kept alive after the response, serverless database connections, and parity of routing and redirects with the Node server.

### Modified Capabilities
- `deployment-portability`:
  - "One container image for every environment" becomes one build per hosting target (container image or Vercel), each configured the same way at runtime;
  - "Configuration read at runtime" adds how a missing setting is reported on a host without a launcher.
- `static-page-sync`: "Automatic trigger, no manual step" runs once per deployment on hosts that run many short-lived instances, instead of once per process.

## Impact

- **Code:**
  - `astro.config.mjs`: target switch, adapter, a Vite plugin (`src/lib/vercel/vitePlugin.mjs`) overriding EmDash's scheduler and wait-until modules;
  - `src/middleware.ts`: sync once per deployment, settings guard;
  - `src/lib/db/postgresRuntime.mjs`, `src/lib/db/sessionDriver.mjs`: pooling, URL selection;
  - `scripts/start.mjs`: `missingSettings` shared with the guard;
  - `scripts/db-setup.mjs`: direct URL for migrations;
  - new: the cron endpoint, the sync endpoint, `vercel.json` (region and crons only; the pipeline change adds the rest).
- **Dependencies:** `@astrojs/vercel` (v11, peer `astro ^7`), `@vercel/functions` (`waitUntil`, `attachDatabasePool`).
- **New environment variables:** `DEPLOY_TARGET` (build), `CRON_SECRET`, `DATABASE_URL_UNPOOLED` (or the Neon equivalent). Documented in `.env.example`.
- **Unchanged:** `npm run dev` (SQLite + disk), the Docker image and compose stack, the container CI job.
- **Docs:** new `docs-site` page "Deploying to Vercel" (runtime part); `running-anywhere.md` links to it.
- **Safeguarding:** no new data flows. The endpoints answer with status only and reveal no configuration, as `/readyz` does.
