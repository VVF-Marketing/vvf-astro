## Why

Once the site runs on Vercel functions (`run-on-vercel-functions`) with media in Blob (`store-media-in-vercel-blob`), deploying it still takes several steps that are easy to get wrong if done by hand:
- migrating the right database;
- building with the right target;
- syncing static pages;
- checking the deployment before it takes traffic.

Each pull request should also get its own preview with its own database, so reviewers can click through a change without touching production or each other. `make-app-portable` left deploy workflows, previews and blue/green switching out of scope; this change adds them for Vercel.

Production holds child data. The rule (decided with the user 2026-10-23): **child data never leaves production**. Previews get only public content (the public seed now, the preview refresh from production later, in `refresh-preview-from-production`) plus stand-in children.

Depends on `run-on-vercel-functions` and `store-media-in-vercel-blob`. Basecamp card: none yet (2026-10-22).

## What Changes

- **GitHub Actions drive every deploy; Vercel's Git auto-deploys are off.** A deploy happens only after the checks it depends on have passed, and every deploy uses a prebuilt output (`vercel build` → `vercel deploy --prebuilt`).
- **PR code never runs with a deploy credential.** Previews and production are the Preview and Production environments of one project, `vvf-astro`, in the foundation's one Vercel team (decided 2026-10-22: no second paid team; 2026-10-23: one project). Vercel tokens are valid for the whole team, and a PR can change the workflow it runs, so a PR's code is built in a job with **no secrets**. A separate deploy job, triggered by `workflow_run`, always runs `main`'s workflow file: it holds the token, deploys the prebuilt output to the Preview environment only, and runs the PR's migrations only after its last use of the token. Neon's API key for previews is scoped to the preview Neon project. Production variables in Vercel are marked *sensitive* (write-only). Accepted risk: the team token can reach production, so anyone who can change `main`'s workflows could misuse it.
- **A preview per pull request:**
  - a Neon branch per PR, copied from the **preview parent** in a separate preview Neon project, which holds the public seed plus stand-in children;
  - a shared **preview Blob store** holding public seed media;
  - migrations applied to the branch, then a preview deployment pointed at it;
  - static pages synced, then the smoke tests run against the preview URL;
  - the preview URL posted on the PR;
  - the branch deleted when the PR closes, after any running check is cancelled.
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
- **CI:** the smoke suite runs against every Vercel preview; the full e2e suite stays in the SQLite and container jobs. Third-party scripts are blocked in e2e by default.

## Capabilities

### New Capabilities
- `deploy-pipeline`: how changes reach Vercel. Covers per-PR previews with isolated data, gated production deploys with migrations, staged promotion, rollback, and the separation of preview and production data and secrets.

### Modified Capabilities
- `deployment-portability`: "Portability tested in CI" adds a smoke run against each pull request's Vercel preview (Neon + Blob).

## Impact

- **New files:**
  - `.github/workflows/preview-build.yml` (no secrets) and `.github/workflows/deploy.yml` (preview deploy via `workflow_run`, production, cleanup);
  - `scripts/deploy/` helpers: settings check over variable names, wait-for-ready, sync trigger;
  - `vercel.json` additions: `git.deploymentEnabled: false`, crons, region.
- **Changed:**
  - `.github/workflows/test.yml` becomes callable (`workflow_call`) so deploys can depend on it;
  - `playwright.container.config.ts`, or a new `playwright.preview.config.ts`, adds the protection-bypass header and an external base URL;
  - `db:setup` adds stand-in children only with `SEED_FIXTURE_CHILDREN=1`, and their photo becomes an illustrated placeholder;
  - the e2e suite blocks third-party scripts by default.
- **External setup (one-time, documented):**
  - one Vercel project in the foundation's Pro team, `vvf-astro`, with Preview and Production environments (the `vvf-astro-preview` project of 2026-10-22 is retired once previews have moved);
  - Neon projects `vvf-production` and `vvf-preview` through the Vercel Marketplace, each attached to one environment;
  - Blob stores `vvf-media-production` and `vvf-media-preview`, each connected to one environment;
  - GitHub environment `preview`, used only by `main`'s `preview-deploy` and `preview-cleanup`: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PREVIEW_PROJECT_ID` (`vvf-astro`'s id), `NEON_PREVIEW_API_KEY` (scoped to `vvf-preview`), `NEON_PREVIEW_PROJECT_ID`, the preview `VERCEL_AUTOMATION_BYPASS_SECRET` and `EMDASH_SYNC_PAT`;
  - GitHub environment `production` (`main` only): `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `PRODUCTION_DATABASE_URL_UNPOOLED`, `EMDASH_TARGET_FINGERPRINT`, the production `EMDASH_SYNC_PAT`;
  - `preview-build` gets no secrets at all.
- **Docs:** `deploying-to-vercel.md` (pipeline, environments, rollback runbook, migration rule); `testing-and-ci.md`; README "Running in a container" gains a pointer to Vercel.
- **Safeguarding:** child data never leaves production; previews hold only public content and stand-in children. A PR's code never runs where a deploy credential is: it's built without secrets, and the deploy job that holds the team token is always `main`'s definition. Production's GitHub secrets live in the `production` environment, which only `main` can use, and production's Vercel variables (which hold the database with child data) are sensitive, so no token can read them back. Eduardo's review on #32 asked for a separate team or project. The team was declined for cost (2026-10-22), and the project because it didn't limit the token (2026-10-23); the remaining risk (a token in `main`'s workflows that can reach production) is accepted and documented in design D0.
