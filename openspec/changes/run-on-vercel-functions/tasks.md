## 1. Spike

- [ ] 1.1 Deploy a throwaway Vercel project (Pro team, preview only) from a spike branch with `DEPLOY_TARGET=vercel`, a Neon database seeded by `npm run db:setup -- --yes`, and an S3-compatible bucket. Answer D0's five questions:
  - bundle size;
  - redirect status codes and `/es` routing;
  - whether the virtual-module aliases take effect;
  - whether sign-in works across instances;
  - cold start and sync duration.

  Record the answers in design.md (D0, D3, D4, D7). Adjust later tasks if they change the approach, and check with the user if they change the scope.

## 2. Build target

- [ ] 2.1 Add `@astrojs/vercel` (v11) and `@vercel/functions`. In `astro.config.mjs`, select the adapter from `DEPLOY_TARGET` (D1), and add `vercel.json` with `regions` only. Verify:
  - `npm run dev` and `docker build --target runtime .` behave as before (container CI job green);
  - `DEPLOY_TARGET=vercel DB_ADAPTER=postgres npx astro build` produces `.vercel/output` with one Node.js function.
- [ ] 2.2 Document `DEPLOY_TARGET` in `.env.example` and in a new `docs-site/src/content/docs/deploying-to-vercel.md` (runtime section: target, region, runtime), and link it from `running-anywhere.md`. Verify the docs site builds (`docs-build` CI job).

## 3. Required settings

- [ ] 3.1 Move `missingSettings` to `src/lib/settings.mjs`, keep `scripts/start.mjs` using it, and add the Vercel-target guard in `src/middleware.ts` (D2): 503 with a generic body for every path but `/healthz`, and the names logged once per instance. Verify:
  - `scripts/start.test.mjs` still passes;
  - new unit tests cover the guard (missing `DATABASE_URL` → 503 and the name logged, `/healthz` → 200);
  - the body doesn't contain the variable name.

## 4. Scheduled and deferred work

- [ ] 4.1 Add the Vercel-target aliases for `virtual:emdash/scheduler` (→ `createScheduler = null`) and `virtual:emdash/wait-until` (→ `waitUntil` from `@vercel/functions`) (D3, D4). Verify with a unit test over the Vercel build output: no `NodeCronScheduler` in the server chunks, and `@vercel/functions`' `waitUntil` imported. Also check that the Node build still contains the scheduler.
- [ ] 4.2 Add `src/pages/api/cron/emdash.ts` (D3): Bearer `CRON_SECRET`, calls `runScheduledTasks`, no-store, not localized, not in the sitemap. Add the 5-minute `crons` entry to `vercel.json`, and `CRON_SECRET` to `.env.example`. Verify:
  - unit tests cover the endpoint (401 without or with a wrong secret; 200 and one sweep with it; 500 with no detail on failure);
  - `sitemap.test.ts` still excludes it;
  - on the spike deployment, an entry scheduled 2 minutes ahead is published within 5 minutes with no visitor traffic.
- [ ] 4.3 Document scheduled work on Vercel (cron, secret, expected delay) in `deploying-to-vercel.md`, and verify the docs site builds.

## 5. Static-page sync once per deployment

- [ ] 5.1 Add the per-deployment sync marker and the transaction-scoped advisory lock around `syncStaticPages` (D5). Keep the per-process behaviour on SQLite. Verify:
  - unit tests cover a matching marker (skip), a busy lock (skip) and success (marker written);
  - `staticPageSync.test.ts` still passes;
  - an integration test on CI Postgres fires 5 concurrent first requests and finds one sync and no duplicate `pages` or copy rows.
- [ ] 5.2 Add `POST /api/internal/sync-static-pages` (Bearer `EMDASH_SYNC_PAT`, returns counts), and the protection-bypass header on the sync's own calls when `VERCEL_AUTOMATION_BYPASS_SECRET` is set (D5). Verify:
  - unit tests cover 401 without the token and counts with it;
  - on the spike preview with Deployment Protection on, the endpoint syncs and a later cold start doesn't re-sync (function logs).
- [ ] 5.3 Update `docs-site` (the static-page sync section of `architecture.md` or `localization-and-copy.md`, wherever the trigger is described) to say "once per deployment on Vercel", and verify the docs site builds.

## 6. Postgres on functions

- [ ] 6.1 Add `directDatabaseUrl()` (`DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`). Use it in `scripts/db-setup.mjs` and `scripts/data.mjs`. Cap the pool sizes (`DATABASE_POOL_MAX`, default 5; sessions 2), and attach both pools with `attachDatabasePool` on the Vercel target (D6). Document the new variables in `.env.example`. Verify:
  - unit tests for URL selection and pool options;
  - `db-setup.test.mjs` and the container CI job still pass;
  - on the spike, `npm run db:setup` against the Neon direct URL succeeds, and a 200-request burst (`npx autocannon -c 50`) against the preview shows no connection errors in the logs.

## 7. Routing parity

- [ ] 7.1 Per D0's answer, make every legacy redirect come out with its declared status on Vercel (D7). Verify with a check over `.vercel/output/config.json`: every `STATIC_REDIRECTS`/`DYNAMIC_REDIRECTS` entry has its `redirectStatus` and destination. Also run the existing redirect and `/es` e2e specs against the spike preview with `PLAYWRIGHT_BASE_URL` and the bypass header.

## 8. Integration check

- [ ] 8.1 On the spike preview, run the full e2e suite (`playwright.container.config.ts` pointed at the preview URL with the bypass header) and the sign-in-across-instances check from D0. Record the results and the measured bundle size and cold start in design.md. Then delete the spike Vercel project and Neon database.

## Workflow follow-up

- Archive the change once reviewed, and close the Basecamp card linked in proposal.md with `basecamp cards done <id|url>`.
- `store-media-in-vercel-blob` and `add-vercel-deploy-pipeline` build on this change.
