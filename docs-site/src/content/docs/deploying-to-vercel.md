---
title: Deploying to Vercel
description: How the site runs on Vercel's functions — the build target, settings, database connections, scheduled work and the static-page sync.
---

The site can be hosted on Vercel, with its data in Neon Postgres (Vercel Marketplace). It's the same app as the [container image](/running-anywhere/), built for a different target. Vercel runs it as short-lived functions rather than one long-lived server, so a few things work differently, described below. The design is in `openspec/changes/run-on-vercel-functions/`.

Media lives in a private Vercel Blob store (`STORAGE=blob`, [below](#media); `STORAGE=s3` still works). The deploy pipeline (previews per pull request, staged production deploys) and the production move are separate changes still to come (`add-vercel-deploy-pipeline`, `move-production-to-vercel`).

## Building for Vercel

```bash
DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=blob vercel build   # writes .vercel/output
vercel deploy --prebuilt                                           # uploads it
```

- **Use `vercel build`, not `astro build`.** Both write `.vercel/output`, but only `vercel build` copies `vercel.json`'s `crons` into it. A prebuilt deploy of `astro build`'s output has no cron, so scheduled posts never go live and nothing reports it (found on the spike deployment). `scripts/vercel-build.test.mjs` fails on output without the cron. `vercel build` needs a linked project (`vercel link`), or in CI a settings-only `.vercel/project.json`, as `test.yml` writes.
- **`DEPLOY_TARGET=vercel`** picks `@astrojs/vercel` instead of `@astrojs/node`. Without it, nothing changes: `npm run dev`, `npm run build` and the container image stay on the Node server.
- **One Node.js function** (response streaming on) serves every page, the CMS admin and its API; static files go to Vercel's CDN. The function is about 48 MB, against Vercel's 250 MB limit.
- **Node version:** the adapter takes the function's runtime from the Node version of the machine that builds. CI builds on Node 22 (`nodejs22.x`); a build on a newer Node gets the newest runtime Vercel has (`nodejs24.x` from Node 26). Build where the Node version is the one you want to run.
- **Region:** `vercel.json` pins `iad1` (US East), next to the Neon database. Change both together. Prebuilt output doesn't carry the region, so also set the project's Function Region to `iad1` (new projects default to it; the spike's function ran there).
- **Redirects:** the legacy Webflow redirects (`src/lib/legacyRoutes.mjs`) become Vercel routes, keeping their 301s. `scripts/vercel-build.test.mjs` checks each one, plus the function's size, against `.vercel/output`; the CI container job builds the Vercel target and runs it.

## Settings

The same variables as the container (see `.env.example`), set per environment in Vercel. There's no launcher on Vercel to refuse a bad start, so the site checks on each instance's first request instead: if a setting the build's mode needs is missing (`DATABASE_URL` for Postgres, the `S3_*` settings for S3, `BLOB_READ_WRITE_TOKEN` for Blob, and on Vercel always `CRON_SECRET` and `EMDASH_SYNC_PAT`), every request except `/healthz` answers **503**, and the function log says `Missing required settings: …`. The response itself never names the variable. The last two are required so that scheduled publishing and the page sync can't stop without anyone noticing.

Vercel-only settings:

| Variable | What it's for |
| --- | --- |
| `CRON_SECRET` | The bearer secret Vercel Cron sends to `/api/cron/emdash`. Required: unset, the site answers 503. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Set by Vercel when *Protection Bypass for Automation* is on. Lets the static-page sync call its own protected preview. |

## Database connections

- **Runtime:** `DATABASE_URL`, Neon's **pooled** URL (the `-pooler` host the integration sets). Each instance keeps at most `DATABASE_POOL_MAX` connections (default 5) plus 2 for sign-in sessions, closes idle ones after 10 seconds, and on Vercel lets Fluid compute release them before an instance is frozen.
- **Migrations, setup and imports:** `DATABASE_URL_UNPOOLED`, the **direct** URL. `npm run db:setup` and `npm run data:import` prefer it (Neon's pooler runs in transaction mode, which migrations' locks don't survive), and fall back to `DATABASE_URL`.
- **Sessions** use their own small pool rather than one long-lived connection, so a sign-in survives an instance being frozen and resumed.

## Media

With `STORAGE=blob`, every media file is in **one private Blob store** per environment: photos, report PDFs, child photos and EmDash's `backups/`. The design is in `openspec/changes/store-media-in-vercel-blob/`.

- **Store and token.** Create the store as private (`vercel blob create-store <name> --access private --region iad1`, or in the dashboard) and connect it to the project, which sets `BLOB_READ_WRITE_TOKEN`. The adapter (`src/lib/storage/vercelBlob.mjs`) reads the token at runtime; it's never in the build. Creating a store from the CLI also pulls every one of the project's variables into the repo's `.env.local`, which `npm run dev` reads: trim it back afterwards.
- **Privacy.** Nothing is ever uploaded with public access, so a blob's own URL answers 403 to anyone without the token. Visitors only get files through the site's media route, `/_emdash/api/media/file/<key>`, which never serves `backups/`. That's the same URL in every storage mode, so content doesn't change.
- **Uploads go straight to Blob.** The admin asks for a signed upload link, valid for 10 minutes, for one key, its type and its size, and usable once; Blob enforces each limit. So files larger than functions' 4.5 MB request limit upload fine (tested with 20 MB). The admin's CSP allows `https://vercel.com`, where those links point.
- **Serving.** The media route streams files of any size from Blob (tested with 20 MB; functions' 4.5 MB limit doesn't apply to streamed responses). On Vercel, the middleware also has Vercel's CDN cache each file for **10 minutes** (`src/lib/mediaCdnCache.ts`); files above about 5 MB aren't cached by the CDN and are served through the function each time. A removed or replaced file, a child's photo included, can therefore still be served for up to 10 minutes. To stop that at once, purge the CDN: `vercel cache purge --type cdn`.
- **Seeding and copying.** `npm run db:setup` with `STORAGE=blob` uploads the public seed media into the store. `npm run media:copy -- --to blob` copies from disk, and `--from s3 --to blob` from an S3 bucket ([Running Anywhere](/running-anywhere/)).

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
