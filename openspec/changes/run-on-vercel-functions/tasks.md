## 1. Spike

- [x] 1.1 Local spike: build with `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=s3 npx astro build` and answer D0's first three questions from the build output:
  - bundle size (`du -sh .vercel/output/functions`);
  - redirect status codes in `.vercel/output/config.json`;
  - whether the scheduler and wait-until overrides take effect.

  Record the answers in design.md (D0, D3, D4, D7). Adjust later tasks if they change the approach, and check with the user if they change the scope. D0's last two questions need a live deployment (task 9.1).

## 2. Build target

- [x] 2.1 Add `@astrojs/vercel` (v11) and `@vercel/functions`. In `astro.config.mjs`, select the adapter from `DEPLOY_TARGET` (D1), and add `vercel.json` with `regions` only. Verify:
  - `npm run dev` and the default `npm run build` behave as before (unit and SQLite e2e suites green; the container CI job stays green on the PR);
  - `DEPLOY_TARGET=vercel DB_ADAPTER=postgres npx astro build` produces `.vercel/output` with one Node.js function.
- [x] 2.2 Document `DEPLOY_TARGET` in `.env.example` and in a new `docs-site/src/content/docs/deploying-to-vercel.md` (runtime section: target, region, runtime), and link it from `running-anywhere.md`. Verify the docs site builds (`docs-build` CI job).

## 3. Required settings

- [x] 3.1 Move `missingSettings` to `scripts/lib/settings.mjs`, keep `scripts/start.mjs` using it, and add the Vercel-target guard in `src/middleware.ts` (D2): 503 with a generic body for every path but `/healthz`, and the names logged once per instance. Verify:
  - `scripts/start.test.mjs` still passes;
  - new unit tests cover the guard (missing `DATABASE_URL` → 503 and the name logged, `/healthz` → 200);
  - the body doesn't contain the variable name.

## 4. Scheduled and deferred work

- [x] 4.1 Add the Vercel-target overrides (a Vite plugin) for `virtual:emdash/scheduler` (→ `createScheduler = null`) and `virtual:emdash/wait-until` (→ `waitUntil` from `@vercel/functions`) (D3, D4). Verify with a unit test over the Vercel build output: no `NodeCronScheduler` in the server chunks, and `@vercel/functions`' `waitUntil` imported. Also check that the Node build still contains the scheduler.
- [x] 4.2 Add `src/pages/api/cron/emdash.ts` (D3): Bearer `CRON_SECRET`, calls `runScheduledTasks`, no-store, not localized, not in the sitemap. Add the 5-minute `crons` entry to `vercel.json`, and `CRON_SECRET` to `.env.example`. Verify:
  - unit tests cover the endpoint (401 without or with a wrong secret; 200 and one sweep with it; 500 with no detail on failure);
  - it stays out of the sitemap (`e2e/platform-endpoints.spec.ts`; the sitemap is built from copy manifests, which endpoints never have).
- [x] 4.3 Document scheduled work on Vercel (cron, secret, expected delay) in `deploying-to-vercel.md`, and verify the docs site builds.

## 5. Static-page sync once per deployment

- [x] 5.1 Add the per-deployment sync marker and the transaction-scoped advisory lock around `syncStaticPages` (D5). Keep the per-process behaviour on SQLite. Verify:
  - unit tests cover a matching marker (skip), a busy lock (skip) and success (marker written);
  - `staticPageSync.test.ts` still passes;
  - an integration test on Postgres (local Postgres 16, and the CI container job) fires 5 concurrent first-request syncs and finds one sync and one marker row.
- [x] 5.2 Add `POST /api/internal/sync-static-pages` (Bearer `EMDASH_SYNC_PAT`, returns counts), and the protection-bypass header on the sync's own calls when `VERCEL_AUTOMATION_BYPASS_SECRET` is set (D5). Verify with unit tests: 401 without the token, counts with it, and the header added only when the secret is set.
- [x] 5.3 Update `docs-site` (the static-page sync section of `architecture.md` or `localization-and-copy.md`, wherever the trigger is described) to say "once per deployment on Vercel", and verify the docs site builds.

## 6. Postgres on functions

- [x] 6.1 Add `directDatabaseUrl()` (`DATABASE_URL_UNPOOLED`, falling back to `DATABASE_URL`). Use it in `scripts/db-setup.mjs` and `scripts/data.mjs`. Cap the pool sizes (`DATABASE_POOL_MAX`, default 5; sessions 2), and attach both pools with `attachDatabasePool` on the Vercel target (D6). Document the new variables in `.env.example`. Verify:
  - unit tests for URL selection and pool options;
  - `db-setup.test.mjs` still passes;
  - `npm run db:setup -- --yes` against local Postgres 16 with only `DATABASE_URL_UNPOOLED` set for migrations succeeds;
  - the container CI job stays green on the PR.

## 7. Routing parity

- [x] 7.1 Per D0's answer, make every legacy redirect come out with its declared status on Vercel (D7). Verify with a check over `.vercel/output/config.json`: every `STATIC_REDIRECTS`/`DYNAMIC_REDIRECTS` entry has its `redirectStatus` and destination.

## 8. Integration check (local)

- [x] 8.1 Run the unit suite, the SQLite e2e suite on the default build, and `openspec validate run-on-vercel-functions --strict`. Then open a draft PR and get its CI (unit, Storybook, e2e, container, docs) green.

## 9. Live verification on Vercel

These need a Vercel project on the foundation's Pro team, a Neon database and an S3-compatible bucket. This session's network couldn't reach Vercel, so they're done from a machine or session that can.

- [x] 9.1 Deploy a throwaway preview from this branch (`DEPLOY_TARGET=vercel`, Neon seeded by `npm run db:setup -- --yes`, S3-compatible bucket), and answer D0's live questions: whether sign-in works across instances (magic-link sign-in, then requests landing on different instances), cold-start time, and sync duration inside one `waitUntil`. Record them in design.md. _Done 2026-10-22 without a bucket (media skipped; Blob gets its own spike); results under D0._
- [x] 9.2 On the preview, an entry scheduled 2 minutes ahead is published within 5 minutes with no visitor traffic (cron calling `/api/cron/emdash`). _Passed once the build used `vercel build` (D0: `astro build` drops the crons). An admin editor had the entry open during the window; rerun with no one signed in if in doubt._
- [ ] 9.3 With Deployment Protection on, `POST /api/internal/sync-static-pages` syncs through the bypass header, and a later cold start doesn't re-sync (function logs). Five concurrent first requests to a fresh deployment leave no duplicate `pages` or copy rows. _Partly done: the bypass sync, one sync per deployment and the concurrency check passed (D0). Still to do: the manual `POST /api/internal/sync-static-pages` with the bypass header (needs the sync token)._
- [x] 9.4 `npm run db:setup` against the Neon direct URL succeeds, and a 200-request burst (`npx autocannon -c 50`) against the preview shows no connection errors in the logs.
- [ ] 9.5 Run the full e2e suite (`playwright.container.config.ts` pointed at the preview URL with the bypass header), including the redirect and `/es` specs. Record the results, the measured bundle size and the cold start in design.md. Then delete the spike Vercel project and Neon database. _Results recorded under D0 (bundle 46 MB unzipped, 14 MB as deployed). The spike is kept for `store-media-in-vercel-blob` 1.1; delete it after that._

## Workflow follow-up

- Archive the change once reviewed, and close the Basecamp card linked in proposal.md with `basecamp cards done <id|url>`.
- `store-media-in-vercel-blob` and `add-vercel-deploy-pipeline` build on this change.
