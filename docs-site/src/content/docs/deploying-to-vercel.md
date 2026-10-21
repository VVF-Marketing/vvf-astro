---
title: Deploying to Vercel
description: How the site runs on Vercel's functions — the build target, settings, database connections, scheduled work and the static-page sync.
---

The site can be hosted on Vercel, with its data in Neon Postgres (Vercel Marketplace). It's the same app as the [container image](/running-anywhere/), built for a different target. Vercel runs it as short-lived functions rather than one long-lived server, so a few things work differently, described below. The design is in `openspec/changes/run-on-vercel-functions/`.

Media in Vercel Blob, the deploy pipeline (previews per pull request, staged production deploys) and the production move are separate changes still to come (`store-media-in-vercel-blob`, `add-vercel-deploy-pipeline`, `move-production-to-vercel`). Until then, a Vercel deployment uses an S3-compatible bucket for media (`STORAGE=s3`).

## Building for Vercel

```bash
DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=s3 npx astro build   # writes .vercel/output
```

- **`DEPLOY_TARGET=vercel`** picks `@astrojs/vercel` instead of `@astrojs/node`. Without it, nothing changes: `npm run dev`, `npm run build` and the container image stay on the Node server.
- **One Node.js function** (`nodejs22.x`, response streaming on) serves every page, the CMS admin and its API; static files go to Vercel's CDN. The function is about 48 MB, against Vercel's 250 MB limit.
- **Region:** `vercel.json` pins `iad1` (US East), next to the Neon database. Change both together.
- **Redirects:** the legacy Webflow redirects (`src/lib/legacyRoutes.mjs`) become Vercel routes, keeping their 301s. `scripts/vercel-build.test.mjs` checks each one, plus the function's size, against `.vercel/output`; the CI container job builds the Vercel target and runs it.

## Settings

The same variables as the container (see `.env.example`), set per environment in Vercel. There's no launcher on Vercel to refuse a bad start, so the site checks on each instance's first request instead: if a setting the build's mode needs is missing (`DATABASE_URL` for Postgres, the `S3_*` settings for S3, and on Vercel always `CRON_SECRET` and `EMDASH_SYNC_PAT`), every request except `/healthz` answers **503**, and the function log says `Missing required settings: …`. The response itself never names the variable. The last two are required so that scheduled publishing and the page sync can't stop without anyone noticing.

Vercel-only settings:

| Variable | What it's for |
| --- | --- |
| `CRON_SECRET` | The bearer secret Vercel Cron sends to `/api/cron/emdash`. Required: unset, the site answers 503. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Set by Vercel when *Protection Bypass for Automation* is on. Lets the static-page sync call its own protected preview. |

## Database connections

- **Runtime:** `DATABASE_URL`, Neon's **pooled** URL (the `-pooler` host the integration sets). Each instance keeps at most `DATABASE_POOL_MAX` connections (default 5) plus 2 for sign-in sessions, closes idle ones after 10 seconds, and on Vercel lets Fluid compute release them before an instance is frozen.
- **Migrations, setup and imports:** `DATABASE_URL_UNPOOLED`, the **direct** URL. `npm run db:setup` and `npm run data:import` prefer it (Neon's pooler runs in transaction mode, which migrations' locks don't survive), and fall back to `DATABASE_URL`.
- **Sessions** use their own small pool rather than one long-lived connection, so a sign-in survives an instance being frozen and resumed.

## Scheduled work

EmDash's scheduled publishing, plugin cron jobs (such as the event-recap reminder) and cleanup normally run from a timer inside the server. On Vercel there's no server to keep a timer alive, so:

- the timer is turned off in the Vercel build;
- **Vercel Cron** calls `GET /api/cron/emdash` every 5 minutes (`vercel.json`), with `Authorization: Bearer $CRON_SECRET`, and that runs the same work;
- a post scheduled for 10:00 goes live by 10:05. Overlapping runs are safe: each due entry is published once.

Vercel only runs crons on **production** deployments, so scheduled posts don't go live by themselves on previews.

Work EmDash defers until after a response (bookkeeping, the static-page sync) is handed to Vercel's `waitUntil`, so it finishes even though the response has gone.

## Static-page sync

The sync that keeps the CMS's `pages` inventory and copy collections in step with the code ([Localization & Page Copy](/localization-and-copy/)) runs **once per deployment** on Postgres, not once per server process:

- each instance's first request tries it, under a database lock; the first to get the lock syncs and records the deployment (`VERCEL_DEPLOYMENT_ID`, or the build on the container), and every later instance of that deployment skips it;
- the pipeline can trigger it right after a deploy with `POST /api/internal/sync-static-pages` and `Authorization: Bearer $EMDASH_SYNC_PAT`. That always syncs, and answers with the counts (200), or 202 when another instance holds the lock. A 202 isn't success: retry (every few seconds, for up to a couple of minutes) until the answer is 200, and fail the deploy otherwise.

On SQLite (local development) it still runs on each process's first request, as before.

## Health

`/healthz` and `/readyz` work as on the container ([Running Anywhere](/running-anywhere/#health)). On Vercel, `/readyz` is what a deploy checks before sending traffic to a new deployment. Like the health endpoints, `/api/cron/emdash` and `/api/internal/sync-static-pages` only answer at their own path: their `/es/` versions are 404.
