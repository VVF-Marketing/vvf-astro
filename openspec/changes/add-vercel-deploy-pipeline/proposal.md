## Why

Once the site runs on Vercel functions (`run-on-vercel-functions`) with media in Blob (`store-media-in-vercel-blob`), deploying it still takes several steps that are easy to get wrong if done by hand:
- migrating the right database;
- building with the right target;
- syncing static pages;
- checking the deployment before it takes traffic.

Each pull request should also get its own preview with its own database, so reviewers can click through a change without touching production or each other. `make-app-portable` left deploy workflows, previews and blue/green switching out of scope; this change adds them for Vercel.

Production holds child data, so previews must never be made from it.

Depends on `run-on-vercel-functions` and `store-media-in-vercel-blob`. Basecamp card: _link the hosting card here when the change is started._

## What Changes

- **GitHub Actions drive every deploy; Vercel's Git auto-deploys are off.** A deploy happens only after the checks it depends on have passed, and every deploy uses a prebuilt output (`vercel build` → `vercel deploy --prebuilt`).
- **A preview per pull request:**
  - a Neon branch per PR, from a **separate preview Neon project** seeded only with the public seed;
  - a shared **preview Blob store** holding public seed media;
  - migrations applied to the branch, then a preview deployment pointed at it;
  - static pages synced, then smoke and e2e tests run against the preview URL;
  - the preview URL posted on the PR;
  - the branch deleted when the PR closes.
- **Production on merge to `main`, staged then promoted:**
  1. the tests pass;
  2. required settings are checked;
  3. production migrations run with the pinned database fingerprint;
  4. a production deployment is created without taking the domain;
  5. it's smoke-tested on its own URL;
  6. only then is it promoted to the domain, with static pages synced.

  A failure at any step leaves the current production serving.
- **Rollback in one command:** promoting the previous deployment (`vercel rollback`), plus a runbook. Migrations follow an expand-then-contract rule, so the previous deployment still works on the migrated database.
- **Environment inventory:** each Vercel environment (Production, Preview, Development) and GitHub environment (`preview`, `production`) has a documented list of variables and secrets, with no production secret available to PR workflows.
- **CI:** the e2e suite also runs against every Vercel preview, alongside the existing SQLite and container jobs.

## Capabilities

### New Capabilities
- `deploy-pipeline`: how changes reach Vercel. Covers per-PR previews with isolated data, gated production deploys with migrations, staged promotion, rollback, and the separation of preview and production data and secrets.

### Modified Capabilities
- `deployment-portability`: "Portability tested in CI" adds the e2e run against each pull request's Vercel preview (Neon + Blob).

## Impact

- **New files:**
  - `.github/workflows/deploy.yml` (preview, production, cleanup);
  - `scripts/deploy/` helpers: settings check over `vercel env pull`, wait-for-ready, sync trigger;
  - `vercel.json` additions: `git.deploymentEnabled: false`, crons, region.
- **Changed:**
  - `.github/workflows/test.yml` becomes callable (`workflow_call`) so deploys can depend on it;
  - `playwright.container.config.ts`, or a new `playwright.preview.config.ts`, adds the protection-bypass header and an external base URL.
- **External setup (one-time, documented):**
  - Vercel project on the foundation's Pro team;
  - Neon projects `vvf-production` and `vvf-preview` through the Vercel Marketplace;
  - Blob stores `vvf-media-production` and `vvf-media-preview`;
  - GitHub environments and their secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `NEON_API_KEY`, `NEON_PREVIEW_PROJECT_ID`, `PRODUCTION_DATABASE_URL_UNPOOLED`, `EMDASH_TARGET_FINGERPRINT`, `VERCEL_AUTOMATION_BYPASS_SECRET`, `EMDASH_SYNC_PAT` (production and preview values).
- **Docs:** `deploying-to-vercel.md` (pipeline, environments, rollback runbook, migration rule); `testing-and-ci.md`; README "Running in a container" gains a pointer to Vercel.
- **Safeguarding:** previews never contain production data, and PR workflows never see production secrets (they're scoped to the `production` GitHub environment, which only `main` can use).
