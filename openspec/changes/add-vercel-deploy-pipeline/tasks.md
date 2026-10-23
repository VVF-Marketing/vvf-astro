## 1. One-time setup

- [x] 1.0 Create the preview project `vvf-astro-preview` in the foundation's Pro team, next to the production project (D0, single team). Turn on Deployment Protection and Protection Bypass for Automation on it. Verify its project and org ids, and that Vercel's Git auto-deploys are off for both projects. _Done 2026-10-22: `vvf-astro` (`prj_pweontrl6VLg4bVNCKrfHxkiuwfs`) and `vvf-astro-preview` (`prj_k0EmPraTSkFLTkGlnvBdHp6Li6QG`) in team `team_q4gtqJ2NdHGY9DPtrsl4lhYF`; both Astro, Node 22.x, `iad1`, Fluid on, Vercel Authentication on every URL except custom domains, automation bypass on, no Git repository connected. A project's first deployment goes to production when it has none, even without `--prod`, so `preview-deploy` passes `--environment preview` (checked by `workflows.test.mjs`) and reads the URL from `--json`, since the CLI prints JSON rather than the bare URL when it isn't attached to a terminal._
- [ ] 1.1 Create the production Vercel project `vvf-astro` on the foundation's Pro team, with every production variable marked sensitive (D0) (Node.js runtime, region per `run-on-vercel-functions` D1, Deployment Protection on previews with Protection Bypass for Automation). Create the Neon projects `vvf-production` and `vvf-preview` and the Blob stores `vvf-media-production` and `vvf-media-preview` through the Vercel Marketplace and Storage, attached per environment (D1, D2). Verify `vercel env ls` shows the database and Blob variables scoped as in D7, with production values only in Production. _Created 2026-10-22: Neon `vvf-production` (Production of `vvf-astro`) and `vvf-preview` (Preview of `vvf-astro-preview`), free plan, `iad1`; Blob `vvf-media-production` / `vvf-media-preview`, private, `iad1`, same scoping; `CRON_SECRET` random and sensitive in each. Open: the integrations add `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN` etc. as encrypted, not sensitive, so the team token can read the production values. The team's "sensitive by default" setting would fix it but affects the team's other projects; waiting on the user._
- [x] 1.2 Seed `vvf-preview/main` with `npm run db:setup -- --yes` (public seed and media into the preview store), and mint its static-page-sync token (D1). Verify:
  - a Neon branch made from it shows seeded content when the site points at it;
  - a query for child profiles returns only the public seed's fixture rows, if any (`scripts/lib/fixture-children.mjs`), and no real ones.
  _Seeded 2026-10-22: 76 migrations, 130 media files (36.8 MB), 1797 entries; 0 child profiles and 0 users. A manual preview deploy against `vvf-preview/main` answers `/readyz` `{"db":true,"storage":true}`. Admin user and `static-page-sync` token created by the user; `EMDASH_SYNC_PAT` set (sensitive, Preview) and `check-settings.mjs --environment preview` passes live (21 names). Branch check done 2026-10-23: the `pr-38`, `pr-39` and `pr-40` branches served the seeded content, and the full e2e suite passed against their previews._
- [x] 1.3 Create the GitHub environments `preview` and `production` (`production` limited to `main`) with the secrets from proposal.md: the team token, the preview project id and a Neon key scoped to `vvf-preview` in `preview`; the production database's direct URL, fingerprint and sync token only in `production` (D0). Verify:
  - a PR-triggered workflow can't read either environment's secrets: a dry-run job in `preview-build` that echoes whether `VERCEL_TOKEN` and `PRODUCTION_DATABASE_URL_UNPOOLED` are set prints "unset" for both;
  - a production variable can't be read back with the token (`vercel env pull --environment=production` gives empty values for sensitive variables).
  _Done 2026-10-22: `preview` holds `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PREVIEW_PROJECT_ID`, `NEON_PREVIEW_API_KEY` (scoped to `vvf-preview`), `NEON_PREVIEW_PROJECT_ID`, `EMDASH_SYNC_PAT`, `VERCEL_AUTOMATION_BYPASS_SECRET`, and the variables `NEON_PREVIEW_DATABASE=neondb`, `NEON_PREVIEW_ROLE=neondb_owner`. Both environments are limited to `main` (see design D7: `preview` too, or a branch's workflow could ask for its secrets). `production` has no secrets until 3.1. `VERCEL_TOKEN` is a team-scoped token ("Vicky's projects", expires 2027-10-22): a token scoped to the project `vvf-astro-preview` fails `vercel env ls` with "Could not retrieve Project Settings", found by the first live run. Checked 2026-10-23 on throwaway PR #40: `preview-build` printed "unset" for both secrets, and a `preview-build` job asking for the `preview` environment was refused ("Branch \"refs/pull/40/merge\" is not allowed to deploy to preview due to environment protection rules"). Open: the read-back check fails until the production integration variables are re-added as sensitive (`move-production-to-vercel` 1.3)._

## 2. Preview deployments

- [x] 2.1 Add `vercel.json` `git.deploymentEnabled: false`, make `test.yml` callable (`workflow_call`), and add `scripts/deploy/check-settings.mjs` (D5) with unit tests (missing names reported, values never printed). Verify:
  - pushing a branch creates no Vercel deployment on its own;
  - the unit tests pass;
  - one manual `vercel deploy --prebuilt --env DATABASE_URL=…` shows the per-deployment variable at runtime (`/readyz` 200 against a branch database). Otherwise switch to the fallback in Risks. _Built 2026-10-22: `vercel.json` `git.deploymentEnabled: false`, `test.yml` `workflow_call`, `scripts/deploy/check-settings.mjs` (+ tests). Verified 2026-10-23: neither project is connected to Git, so pushes create no deployment; every preview deploy passes `DATABASE_URL` per deployment and `/readyz` answers 200 against the PR's branch._
- [x] 2.2 Add `.github/workflows/preview-build.yml` (no secrets, uploads the artifact) and the `preview-deploy` workflow (`workflow_run`, environment `preview`) per D3: Neon branch with expiry, settings check, deploy, then the PR's migrations with only the branch URL, ready, sync, PR comment. Add `playwright.preview.config.ts` (base URL from an environment variable, bypass header). Verify on this change's PR:
  - the preview URL is posted;
  - `/readyz` is 200;
  - the full e2e suite passes against the preview;
  - a second push redeploys on the same branch;
  - a throwaway PR that edits `preview-deploy` still gets deployed by `main`'s version (the edit has no effect), and one that edits `preview-build` to echo `VERCEL_TOKEN` prints nothing. _Built 2026-10-22: `preview-build.yml`, `deploy.yml` (`preview-deploy`, then `preview-verify` on a fresh runner for ready/sync/comment/e2e), `scripts/deploy/neon-branch.mjs` and `ready-and-sync.mjs` (+ tests), `playwright.preview.config.ts` with `e2e/preview-setup.ts` (the bypass secret is traded once for Vercel's cookie, not sent to third parties), and `scripts/deploy/workflows.test.mjs`, which fails if PR code runs before a credential step, a preview deploys with `--prod`, or `preview-build` gets a secret. The live checks wait for the projects (1.x) and for `deploy.yml` to be on `main` (`workflow_run` only runs from the default branch). Neon's branch API fields (`expires_at`, `connection_uri`) are unverified until then. Verified live 2026-10-23 (PRs #38–#40): URL posted, `/readyz` and sync pass, full e2e passes against the preview, a second push renews `pr-40` and redeploys, updating the one comment; on #40 an edit to `deploy.yml` never ran and `preview-build` saw no secrets. Fixes found by the live runs: the token must be team-scoped (1.3); `vercel deploy --json` is flat in CI (#37); two e2e tests were too strict against a live preview (#39, #41)._
- [x] 2.3 Add `preview-cleanup` (`pull_request_target` closed, never checking out the PR; delete the branch) and the `reset-preview-parent` manual workflow (D1). Verify: closing a test PR deletes `pr-<n>`, and the reset re-seeds `vvf-preview/main`. _(`preview-cleanup` is built in `deploy.yml` and verified: closing #36, #38, #39 and #40 deleted their branches. Re-running a deploy job after its PR closed recreates the branch, which then only expires (`pr-36`, 2026-11-05). `reset-preview-parent` restores `main` from a `seed-snapshot` branch instead of re-seeding, which would wipe the admin and `EMDASH_SYNC_PAT` (design D1, #43). Verified 2026-10-23: `snapshot` took `seed-snapshot`, `reset` restored `main` and kept `main-before-reset-20261023T030222Z`, and this PR's preview, branched from the restored `main`, passed sync and e2e.)_
- [ ] 2.4 Add the preview banner (D8), shown only when `VERCEL_ENV=preview`, with a unit test. Verify on a preview that the banner shows, responses carry `X-Robots-Tag: noindex`, and canonical URLs point at production.
- [ ] 2.5 Verify isolation: two PRs that each add a different test collection get previews that only have their own collection. Revert both test PRs afterwards.

## 3. Production deployments

- [ ] 3.1 Tag the smoke e2e specs (`@smoke`: home, `/es`, a legacy redirect, a media image, the admin login page), and add the `production` job per D3 (pull, check, build `--prod`, pinned migrate, `--skip-domain` deploy, readiness and smoke on the staged URL, promote, sync, domain readiness). Verify, against the production project still on its `*.vercel.app` domain and seeded with the public seed:
  - a merge deploys and promotes;
  - a deliberately failing smoke test (on a throwaway branch run through `workflow_dispatch`) leaves the previous deployment serving;
  - a wrong `EMDASH_TARGET_FINGERPRINT` stops before deploying.
- [ ] 3.2 Check that production crons run: after a production deploy, an entry scheduled 2 minutes ahead is published within 5 minutes, and the cron invocation shows in Vercel's logs.
- [ ] 3.3 Rehearse rollback (D6): promote a release, run `vercel rollback`, and check the previous deployment serves the domain within a minute against the same database. Write the runbook in `deploying-to-vercel.md`.

## 4. Docs

- [ ] 4.1 Document in `deploying-to-vercel.md`:
  - the pipeline diagram and the steps of each job;
  - the environment and secret inventory table (D7);
  - the expand-then-contract migration rule (D4), with a checklist line in a new `.github/pull_request_template.md`;
  - previews and their data rules;
  - rollback.

  Update `testing-and-ci.md` (preview e2e, smoke tags) and the README. Verify the docs site builds, and that each documented command was run in tasks 2–3.

## Workflow follow-up

- Archive the change once reviewed, and close the Basecamp card linked in proposal.md.
- `move-production-to-vercel` moves real data and DNS.
