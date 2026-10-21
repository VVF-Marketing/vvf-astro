## Context

See proposal.md (Why). Starting point:

- **`.github/workflows/test.yml`** runs on push and PR, with these jobs:
  - `unit`, `storybook`, `e2e` (SQLite);
  - `container` (image on Postgres + SeaweedFS, `db:setup`, export/import round trip, e2e);
  - `docs-build`.
- **`scripts/db-setup.mjs`:**
  - migrates (`emdash migrate --from-config`) and seeds an empty database;
  - `--no-seed` only migrates; `--yes` skips the prompt;
  - `EMDASH_TARGET_FINGERPRINT` pins the target, and a mismatch throws.
- **From `run-on-vercel-functions`:**
  - the `DEPLOY_TARGET=vercel` build;
  - `missingSettings`;
  - `POST /api/internal/sync-static-pages` (Bearer `EMDASH_SYNC_PAT`);
  - `/api/cron/emdash`;
  - direct vs pooled URLs (`DATABASE_URL_UNPOOLED`).
- **From `store-media-in-vercel-blob`:** `STORAGE=blob` and `BLOB_READ_WRITE_TOKEN`.
- **Vercel CLI:**
  - `vercel pull --environment=<env>` fetches project settings and variables;
  - `vercel build [--prod]` writes `.vercel/output`;
  - `vercel deploy --prebuilt [--prod] [--skip-domain] [--env K=V]` uploads it, where `--env` sets runtime variables for that deployment only;
  - `vercel promote <url>` and `vercel rollback` move the domain without rebuilding;
  - Deployment Protection on previews is passed with `x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET`;
  - Vercel Cron runs only on production deployments.
- **Neon:**
  - branches are copy-on-write copies of their parent, data included;
  - `neondatabase/create-branch-action` / `delete-branch-action` create and delete them (outputs: direct and pooled URLs), and branches can carry an expiry.

## Goals / Non-Goals

**Goals:**
- Zero manual steps from merge to production, with every failure stopping before the domain moves.
- A preview per PR whose data can never include production data.

**Non-Goals:**
- Previews for fork PRs: they get no secrets, so the preview job is skipped with a note and the container job still covers them.
- Moving production data or DNS (`move-production-to-vercel`).
- Scheduled backups (`move-production-to-vercel`).

## Decisions

### D1. Two Neon projects, not one
`vvf-production` holds production. `vvf-preview` is a separate project whose `main` branch is seeded once with the public seed (`npm run db:setup -- --yes`), with a static-page-sync token minted in it. Every PR branch is created from `vvf-preview/main`, so every preview inherits seeded content and a working `EMDASH_SYNC_PAT`.

**Rejected:** branching previews from production (Neon branches copy data, so previews would contain child data), and one project with a re-seeded root branch (one misclick in the parent selector away from copying production).

A manual workflow (`workflow_dispatch: reset-preview-parent`) resets `vvf-preview/main` from the public seed when it drifts.

### D2. Two Blob stores
`vvf-media-production` and `vvf-media-preview`. The Vercel project's Preview environment holds the preview store's token, and Production holds the production one, so no workflow needs either. The preview store holds public seed media, seeded once with the preview parent, plus whatever reviewers upload. That's acceptable because preview data is public seed content and testers are told not to upload real child photos (docs and the preview banner, below).

### D3. Workflows
`test.yml` gains `on: workflow_call` so `deploy.yml` can reuse it. `deploy.yml`:

**`preview`** (on `pull_request`: opened, synchronize, reopened; same repository only; GitHub environment `preview`; concurrency `preview-${{ pr }}`, cancel in progress):
1. Create or reuse the Neon branch `pr-<number>` from `vvf-preview/main`, expiring in 14 days and renewed on every push.
2. `npm run db:setup -- --no-seed --yes` against the branch's direct URL, so the PR's migrations apply.
3. `vercel pull --environment=preview`, then `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=blob vercel build`.
4. Run the settings check (D5) over the pulled variables plus the branch URLs.
5. `vercel deploy --prebuilt --env DATABASE_URL=<pooled> --env DATABASE_URL_UNPOOLED=<direct>`. The URL comes back on stdout.
6. Wait for `/readyz` (bypass header), then `POST /api/internal/sync-static-pages`.
7. Post or update one PR comment with the URL.
8. Run e2e: `playwright.preview.config.ts`, base URL plus bypass header.

The test jobs run in parallel through `test.yml`, so previews don't wait for them.

**`preview-cleanup`** (on `pull_request` closed): delete the Neon branch `pr-<number>`.

**`production`** (on push to `main`; `needs: test` via `workflow_call`; GitHub environment `production`; concurrency `production`, no cancel):
1. `vercel pull --environment=production`, then run the settings check (D5).
2. `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=blob vercel build --prod`.
3. `npm run db:setup -- --no-seed --yes` with `DATABASE_URL=$PRODUCTION_DATABASE_URL_UNPOOLED` and `EMDASH_TARGET_FINGERPRINT` pinned. A mismatch stops here.
4. `vercel deploy --prebuilt --prod --skip-domain`, which gives a staged URL.
5. Wait for `/readyz` on the staged URL, then run the smoke suite (`@smoke`-tagged e2e: home, `/es`, a legacy redirect, a media image, the admin login page).
6. `vercel promote <staged-url>`.
7. `POST /api/internal/sync-static-pages` on the domain, then `/readyz` on the domain.

**Rejected:** Vercel's Git integration with migrations in the build command. The build would run before tests pass, and a killed build can leave migrations half-run while the old deployment keeps serving.

### D4. Migration rule: expand, then contract
Because step 3 migrates while the previous deployment still serves, and rollback (D6) runs the previous deployment against the migrated database, every migration must work with the code before it:
- add columns and collections first;
- remove or rename only in a later release, once nothing reads them.

EmDash's own migrations follow this. The site's schema changes come through `seed/seed.json` and `npm run cms:schema`. Both go in a new `.github/pull_request_template.md` checklist and in `deploying-to-vercel.md`.

### D5. Settings check before deploy
`scripts/deploy/check-settings.mjs` loads the pulled `.vercel/.env.<env>.local` (plus `--env` overrides) and runs `missingSettings` for `DB_ADAPTER=postgres STORAGE=blob`. It exits non-zero with the names. It never prints values.

### D6. Rollback runbook
`vercel rollback` (or `vercel promote <previous-url>`) moves the domain back instantly. The database stays forward-only (D4). For a bad migration, the runbook says:
- restore with Neon point-in-time recovery into a new branch;
- verify it;
- switch `DATABASE_URL` and redeploy.

Production backups themselves are `move-production-to-vercel`.

### D7. Environment and secret inventory
A table in `deploying-to-vercel.md` lists every variable × {Vercel Production, Vercel Preview, Vercel Development, GitHub `preview`, GitHub `production`} with where it comes from. Notably:
- `GTM_CONTAINER_ID` is set in Production only;
- `FORM_MAIL_*` is Production only, so preview forms show the "write to info@" fallback;
- `SAFEGUARDING_USERS` holds test addresses in Preview;
- `CRON_SECRET` is set in Production; crons only run there.

The GitHub `production` environment is restricted to the `main` branch.

### D8. Marking previews
A small banner on preview deployments ("Preview — test data only; don't upload real photos") is shown when `VERCEL_ENV=preview`. It's read at runtime, so it costs nothing in production, and it backs D2's upload rule. Canonical URLs already point at production (`site` in `astro.config.mjs`), and preview deployments send `X-Robots-Tag: noindex` (Vercel's default for preview URLs; verified in tasks).

## Risks / Trade-offs

- **[Neon branch limits]** → Expiry plus cleanup on close. The plan's branch limit is checked at setup and noted in the docs.
- **[`--env` on prebuilt deploys]** → Verified in task 2.1. If runtime variables can't be set per deployment, the fallback is Vercel branch-scoped Preview variables set through the API (`vercel env add DATABASE_URL preview <git-branch>`).
- **[Smoke tests can't catch everything]** → The full e2e suite already ran against the PR's preview on the same code, and rollback is one command.
- **[A shared preview Blob store]** → Previews can see each other's uploads. Acceptable for test data (D2). A PR that deletes seed media could break other previews; the reset workflow re-seeds.
- **[Production deploys without a human gate]** → Seamless by design. An approval rule on the GitHub `production` environment can be added if the team wants one (Open Questions).

## Migration Plan

1. Create the Vercel project, the Neon projects, the Blob stores and the GitHub environments (task group 1).
2. Turn on `preview` for PRs, and prove it on this change's own PR.
3. Turn on `production`. Until `move-production-to-vercel` lands, the production Vercel project serves only its `*.vercel.app` URL, from a production database seeded with the public seed, so the pipeline is proven before real data or DNS move.

Rollback: disable `deploy.yml`. Nothing else depends on it.

## Open Questions

- Should production deploys need a reviewer's approval (a GitHub environment protection rule)? It's a settings toggle; the default is no.
