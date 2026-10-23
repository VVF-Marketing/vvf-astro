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
- A preview per PR that never holds child data.

**Non-Goals:**
- Previews for fork PRs: they get no secrets, so the preview job is skipped with a note and the container job still covers them.
- Moving production data or DNS (`move-production-to-vercel`).
- Scheduled backups (`move-production-to-vercel`).

## Decisions

### D0. One Vercel project; PR code never runs with a deploy credential
**Decided with the user, 2026-10-23** (replaces the two projects of 2026-10-22; no second paid team since 2026-10-22). Previews and production are the Preview and Production environments of one project, `vvf-astro`, in the foundation's one Pro team. A Vercel access token is valid for the whole team, so a second project never limited what the token could reach; it only added a second set of settings to keep in step. The design therefore keeps PR code away from the token rather than limiting what the token can do:

- **Build without secrets.** `preview-build` runs on `pull_request`, with the PR's own workflow file and code, and gets **no secrets**. It runs `vercel build` with a settings-only `.vercel/project.json` (as CI already does), and uploads `.vercel/output` plus the PR's `scripts/` and `package*.json` as an artifact.
- **Deploy from `main`'s definition.** `preview-deploy` runs on `workflow_run` (after `preview-build` succeeds), so GitHub always uses the workflow file on `main`, whatever the PR changed. It holds the team token (`VERCEL_TOKEN`) and the Neon key scoped to `vvf-preview`, in the GitHub environment `preview`. It only ever runs `vercel deploy --prebuilt` without `--prod`, so its deployments land in `vvf-astro`'s Preview environment.
- **PR code runs only after the credentials are used.** Migrations are the PR's code (its `db:setup` and EmDash version). If they ran first, they could leave something behind, such as a swapped `vercel` binary, for a later step that holds the token. So `preview-deploy` creates the Neon branch and deploys first, and runs the PR's migrations afterwards, given only that branch's database URL (preview data). Steps after that use preview-only secrets (the bypass secret and the preview parent's sync token).
- **Environments stay apart inside the project.** Preview and Production have their own variables, and every production variable is sensitive. Each Blob store is connected to one environment only (D2). Deployment Protection covers previews; production is public.
- **Production stays as before:** `production` runs on push to `main`, in the GitHub environment `production`, limited to `main`. Every production variable in Vercel is marked *sensitive*, so no token can read it back.
- **Neon:** the preview Neon key is scoped to `vvf-preview`. No Neon key for production is stored in GitHub; production migrations use the production environment's direct URL.

**Accepted residual risk:** the token in `preview` reaches production. Anyone who can change workflows on `main` (merge rights) could use it to deploy production, or deploy code that reads production's database at runtime. The same people can already change production's code by merging, so this adds no new kind of access; it does remove the second barrier the two-team design gave.

**Rejected:** a separate preview team, the original D0. Only a separate team limits the token itself (Eduardo's review on #32), but a second Pro team is a second plan, and the user chose not to pay for it. Also rejected: a second project for previews (the 2026-10-22 design: it didn't limit the token and doubled the settings), and running preview deploys from `pull_request` with secrets, because a PR could then rewrite the job that holds the token.

### D1. Child data never leaves production; two Neon projects
**Rule (user, 2026-10-23): child data never leaves production.** Previews get production's public content only through the preview refresh (an allowlist, production to preview only; change `refresh-preview-from-production`), plus stand-in children.

`vvf-production` holds production. `vvf-preview` is a separate Neon project. Its `main` branch is the preview parent: seeded once with the public seed (`npm run db:setup -- --yes`), with a static-page-sync token minted in it. Every preview database (`pr-<n>`) is created from it, so every preview inherits seeded content and a working `EMDASH_SYNC_PAT`.

Stand-in children are the invented profiles in `scripts/lib/fixture-children.mjs`, with an illustrated placeholder photo instead of a program photo (program photos can show real children). They're added only with `SEED_FIXTURE_CHILDREN=1`, by `npm run seed` and, new, by `db:setup`: CI, `container` and the preview parent set it; production never does. So the child tests run on the deployed path without real child data.

**Rejected:** branching previews from production (Neon branches copy data, so previews would contain child data), and one Neon project (one misclick in the parent selector away from copying production, and GitHub's Neon key would reach production).

Until the preview refresh replaces it (decided 2026-10-23), a manual workflow (`workflow_dispatch: reset-preview-parent`) resets `vvf-preview/main` when it drifts. It doesn't re-seed: seeding wipes users and tokens, so the admin and `EMDASH_SYNC_PAT` would have to be made again after every reset. Instead the workflow's `snapshot` action keeps the clean, seeded `main` once as the branch `seed-snapshot`, and `reset` restores `main` from it through Neon's branch restore. Neon keeps `main`'s old state as a backup branch `main-before-reset-<time>` and moves `main`'s children (`seed-snapshot`, open `pr-<n>` branches) under it; the newest backup stays as an undo, and older ones are deleted once nothing hangs off them. Blob media isn't restored: seed media a preview deleted from the shared store is re-uploaded by hand (`npm run db:setup` with the preview store's token), which should be rare (decided with the user 2026-10-23). Once `db:setup` can add stand-in children, the preview parent is seeded once more with `SEED_FIXTURE_CHILDREN=1` and `seed-snapshot` is taken again.

### D2. Two Blob stores
`vvf-media-production` is connected to `vvf-astro`'s Production environment only, and `vvf-media-preview` to its Preview environment only (D0). Each environment holds its own store's token, so no workflow needs either, and a preview deployment can't read production media: its runtime only has the preview store's token. The preview store holds public seed media, seeded once with the preview parent, plus whatever reviewers upload. That's acceptable because preview data is public seed content and testers are told not to upload real child photos (docs and the preview banner, below).

### D3. Workflows
`test.yml` gains `on: workflow_call` so `deploy.yml` can reuse it. `deploy.yml`:

**`preview-build`** (on `pull_request`: opened, synchronize, reopened; same repository only; **no secrets, no environment**; concurrency `preview-${{ pr }}`, cancel in progress):
1. `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=blob vercel build`, with a settings-only `.vercel/project.json` (no token needed; `run-on-vercel-functions` D0).
2. Upload `.vercel/output`, `scripts/`, `package.json` and `package-lock.json` as the artifact `preview-<pr>-<sha>`.

**`preview-deploy`** (on `workflow_run` of `preview-build`, completed with success; runs `main`'s definition (D0); GitHub environment `preview`; concurrency `preview-${{ pr }}`):
1. Download the artifact. Never run anything from it before step 5.
2. Create or reuse the Neon branch `pr-<number>` from `vvf-preview/main`, expiring in 14 days and renewed on every push (Neon key).
3. Run the settings check (D5) over `vvf-astro`'s Preview variable names plus the branch URLs (Vercel token).
4. `vercel deploy --prebuilt --env DATABASE_URL=<pooled> --env DATABASE_URL_UNPOOLED=<direct>` to `vvf-astro`'s Preview environment (Vercel token). The URL comes back on stdout. Then the step drops the token: nothing later gets it.
5. Install the PR's dependencies from the artifact and run its `npm run db:setup -- --no-seed --yes`, with only `DATABASE_URL` / `DATABASE_URL_UNPOOLED` for the branch in its environment, so the PR's migrations apply.

**`preview-verify`** (after `preview-deploy`, on a fresh runner, GitHub environment `preview`; **30-minute limit**):
1. Wait for `/readyz` (bypass header), then `POST /api/internal/sync-static-pages`, retrying while it answers 202 (another instance holds the sync) until it answers 200, for up to 2 minutes; anything else fails the job.
2. Post or update one PR comment with the URL.
3. Run the PR's smoke suite (`@smoke`, the same set production runs): `playwright.preview.config.ts`, base URL plus bypass cookie. The full suite runs in CI (`test.yml`), on SQLite and on Postgres (`container`).

The test jobs run in parallel through `test.yml`, so previews don't wait for them.

**`preview-cleanup`** (on `pull_request_target` closed, which runs `main`'s definition and never checks out the PR): joins the PR's concurrency group with cancel-in-progress, so a running deploy or check is cancelled first, then deletes the Neon branch `pr-<number>`. A check can never be left waiting on a deleted database.

**`production`** (on push to `main`; `needs: test` via `workflow_call`; GitHub environment `production`; concurrency `production`, no cancel):
1. `vercel pull --environment=production` (the team token, from the `production` environment), then run the settings check (D5).
2. `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=blob vercel build --prod`.
3. `npm run db:setup -- --no-seed --yes` with `DATABASE_URL=$PRODUCTION_DATABASE_URL_UNPOOLED` and `EMDASH_TARGET_FINGERPRINT` pinned. A mismatch stops here.
4. `vercel deploy --prebuilt --prod --skip-domain`, which gives a staged URL.
5. Wait for `/readyz` on the staged URL, then run the smoke suite (`@smoke`-tagged e2e: home, `/es`, a legacy redirect, a media image, the admin login page).
6. `vercel promote <staged-url>`.
7. `POST /api/internal/sync-static-pages` on the domain (202 retried until 200, as in `preview-verify` step 1), then `/readyz` on the domain.

**Rejected** (reconsidered 2026-10-23, still rejected): Vercel's Git integration with migrations in the build command. The build would run before tests pass, and a killed build can leave migrations half-run while the old deployment keeps serving.

### D4. Migration rule: expand, then contract
Because step 3 migrates while the previous deployment still serves, and rollback (D6) runs the previous deployment against the migrated database, every migration must work with the code before it:
- add columns and collections first;
- remove or rename only in a later release, once nothing reads them.

EmDash's own migrations follow this. The site's schema changes come through `seed/seed.json` and `npm run cms:schema`. Both go in a new `.github/pull_request_template.md` checklist and in `deploying-to-vercel.md`.

### D5. Settings check before deploy
`scripts/deploy/check-settings.mjs` lists the environment's variable **names** (`vercel env ls <env>`, plus `--env` overrides) and runs `missingSettings` for `DEPLOY_TARGET=vercel DB_ADAPTER=postgres STORAGE=blob` on them, treating a listed name as set. Production variables are sensitive (D0), so their values can't be pulled anyway. It exits non-zero with the missing names, and never prints values.

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
- `CRON_SECRET` and `EMDASH_SYNC_PAT` are set in both (both are required on Vercel; crons only fire in production);
- every production variable is marked sensitive (D0).

The GitHub `production` environment is restricted to the `main` branch, and holds the production database's direct URL, fingerprint and sync token. The team token is in both GitHub environments (D0); `preview`'s copy is only used by `main`'s `preview-deploy`. The bypass secret in `preview` is `vvf-astro`'s.

Both GitHub environments are restricted to `main`, `preview` included. Without that, a branch or same-repository PR could add `environment: preview` to its own workflow and read the team token. `workflow_run` and `pull_request_target` jobs run as `main`, so `main`'s deploy and cleanup jobs still get the secrets.

### D8. Marking previews
A small banner on preview deployments ("Preview — test data only; don't upload real photos") is shown when `VERCEL_ENV=preview`. It's read at runtime, so it costs nothing in production, and it backs D2's upload rule. Canonical URLs already point at production (`site` in `astro.config.mjs`), and preview deployments send `X-Robots-Tag: noindex` (Vercel's default for preview URLs; verified in tasks).

### D9. Third-party scripts in e2e
The e2e suite blocks third-party scripts (Donorbox, GTM and any other host) by default, in one place. Only the widget tests (8.9-6) let them load. These scripts add their own elements, ids, links and requests and change without notice, which is how 5.9-10 and 8.9-4 failed. The per-test Donorbox blocks (8.9-4, `external-links`) are removed once the default is in. 5.9-10's document-only id check stays, since it's right either way, and so does 7.14-2's fix, which is about Vercel's own toolbar and analytics on previews, not a third-party host.

## Risks / Trade-offs

- **[Neon branch limits]** → Expiry plus cleanup on close. The plan's branch limit is checked at setup and noted in the docs.
- **[`--env` on prebuilt deploys]** → Verified in task 2.1. If runtime variables can't be set per deployment, the fallback is Vercel branch-scoped Preview variables set through the API (`vercel env add DATABASE_URL preview <git-branch>`).
- **[Smoke tests can't catch everything]** → The full e2e suite already ran in CI on Postgres (`container`) on the same code, the preview's smoke set ran on a real deployment, and rollback is one command.
- **[A shared preview Blob store]** → Previews can see each other's uploads. Acceptable for test data (D2). A PR that deletes seed media could break other previews; the reset workflow restores the database only, so missing seed media is re-uploaded by hand (D1).
- **[One project: a preview can be promoted]** → Vercel's dashboard offers "Promote to Production" on preview deployments, and one click would put PR code in production. Production changes only through the `production` job; the docs say never to promote a preview.
- **[Single team: the preview token deploys into the same project as production]** → Accepted (D0). PR code never runs where the token is: `preview-build` has no secrets, `preview-deploy` runs `main`'s definition and runs PR code only after the token's last use, and production variables are sensitive. What remains is someone with merge rights misusing it, who could already change production's code.
- **[`workflow_run` adds a hop]** → A preview starts deploying only after `preview-build` finishes, about a minute later than a single job would. Its artifact is deleted after 3 days.
- **[Production deploys without a human gate]** → Decided with the user 2026-10-23: no gate. The merge is the approval, and rollback is one command (D6).

## Migration Plan

1. Create the Vercel projects in the foundation's team, the Neon projects, the Blob stores and the GitHub environments (task group 1).
   1a. Move previews into `vvf-astro` (2026-10-23), in this order: Preview variables; Blob store connections; Deployment Protection and the bypass secret; retarget `deploy.yml` and prove it on one PR; only then delete `vvf-astro-preview`.
2. Turn on `preview` for PRs, and prove it on this change's own PR.
3. Turn on `production`. Until `move-production-to-vercel` lands, production serves only `vvf-astro`'s `*.vercel.app` URL, from a production database seeded with the public seed, so the pipeline is proven before real data or DNS move.

Rollback: disable `deploy.yml`. Nothing else depends on it.

## Open Questions

None. (Production approval was decided 2026-10-23: no gate.)
