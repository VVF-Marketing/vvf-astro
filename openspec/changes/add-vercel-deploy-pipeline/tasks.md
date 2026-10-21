## 1. One-time setup

- [ ] 1.0 Create the separate preview Vercel team (D0) and its project. Verify that a token created in it can't see the production team's projects (`vercel project ls --scope <production team>` fails), can't deploy there (`vercel deploy --prod --scope <production team>` fails), and can't pull production variables.
- [ ] 1.1 Create the production Vercel project on the foundation's Pro team, with every production variable marked sensitive (D0) (Node.js runtime, region per `run-on-vercel-functions` D1, Deployment Protection on previews with Protection Bypass for Automation). Create the Neon projects `vvf-production` and `vvf-preview` and the Blob stores `vvf-media-production` and `vvf-media-preview` through the Vercel Marketplace and Storage, attached per environment (D1, D2). Verify `vercel env ls` shows the database and Blob variables scoped as in D7, with production values only in Production.
- [ ] 1.2 Seed `vvf-preview/main` with `npm run db:setup -- --yes` (public seed and media into the preview store), and mint its static-page-sync token (D1). Verify:
  - a Neon branch made from it shows seeded content when the site points at it;
  - a query for child profiles returns only the public seed's fixture rows, if any (`scripts/lib/fixture-children.mjs`), and no real ones.
- [ ] 1.3 Create the GitHub environments `preview` and `production` (`production` limited to `main`) with the secrets from proposal.md: preview-team token and a Neon key scoped to `vvf-preview` in `preview`, production-team credentials only in `production` (D0). Verify a PR-triggered test workflow can't read a `production` secret: a dry-run job that echoes whether the secret is set prints "unset".

## 2. Preview deployments

- [ ] 2.1 Add `vercel.json` `git.deploymentEnabled: false`, make `test.yml` callable (`workflow_call`), and add `scripts/deploy/check-settings.mjs` (D5) with unit tests (missing names reported, values never printed). Verify:
  - pushing a branch creates no Vercel deployment on its own;
  - the unit tests pass;
  - one manual `vercel deploy --prebuilt --env DATABASE_URL=…` shows the per-deployment variable at runtime (`/readyz` 200 against a branch database). Otherwise switch to the fallback in Risks.
- [ ] 2.2 Add the `preview` job to `.github/workflows/deploy.yml` per D3 (Neon branch with expiry, migrate, build, check, deploy, ready, sync, PR comment), and `playwright.preview.config.ts` (base URL from an environment variable, bypass header). Verify on this change's PR:
  - the preview URL is posted;
  - `/readyz` is 200;
  - the full e2e suite passes against the preview;
  - a second push redeploys on the same branch.
- [ ] 2.3 Add `preview-cleanup` (delete the branch on close) and the `reset-preview-parent` manual workflow (D1). Verify: closing a test PR deletes `pr-<n>`, and the reset re-seeds `vvf-preview/main`.
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
