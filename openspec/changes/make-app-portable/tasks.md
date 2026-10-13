## 1. Spike

- [x] 1.1 With Postgres 16 and MinIO in docker-compose, find out (D0):
  - (a) whether EmDash reads `postgres({ connectionString })` at runtime or at build: build with one URL, run with another;
  - (b) the working way to seed an empty Postgres database (runtime seed file, `emdash seed` CLI, or the seed API);
  - (c) whether `emdash export-seed` captures users, menus, settings and revisions, or a raw dump is needed for export (D8).

  Record the answers in design.md (D0, D2, D6, D8) and adjust later tasks if they change the approach, checking with the user if they change the scope.

- [x] 1.2 Give the Resources: Financials & Transparency copy page the short collection name `copy_resources_financials`, through an optional `slug` on its `COPY_PAGES` entry used by `copyCollectionFor` (D10). Add a unit test that every collection slug (config and seed) is 35 characters or fewer, and that EmDash's index names stay unique after Postgres' 63-character truncation. Regenerate the seed. Verify the full public seed loads into an empty Postgres database.
- [x] 1.3 Move existing data (D10): extend `migrate:copy-collections` so rows in the old `copy_resources_category_financials_transparency` collection (values, drafts, Spanish links) move to the new collection, and the old one is hidden. Verify with unit tests, and on a scratch copy of the local CMS: values kept, and a re-run changes nothing.

## 2. Runtime configuration

- [x] 2.1 Add the `astro:env` schema (D1) and move `EMDASH_SYNC_PAT`, `SAFEGUARDING_USERS`, `SITE_URL` and the database settings to `astro:env/server`. Document every variable in `.env.example`. Verify: a build with no secrets set, then a run with the token set, uses the token; `grep` finds no secret in `dist/`; a missing required variable stops startup with its name.

## 3. Database, storage and sessions

- [x] 3.1 Database selection in `astro.config.mjs` (D2): `DB_ADAPTER=postgres` uses `postgres()` with the runtime `DATABASE_URL`/`DATABASE_SSL`; the default stays `sqlite('file:./data.db')`. Verify `npm run dev` is unchanged, and that a Postgres build starts against compose Postgres.
- [x] 3.2 Storage selection (D3): `STORAGE=s3` uses EmDash's `s3()`; the default stays `local()`. Add `scripts/media-copy.mjs` (local → S3, same keys). Verify an upload lands in MinIO and renders, and that copying the current `uploads/` makes every image render from MinIO.
- [x] 3.3 Sessions in the database via `db0` in deployed mode, and the filesystem locally (D4). Verify that two app instances on the same Postgres share sign-ins. (Done with a magic-link sign-in on instance A, then the same cookie accepted by instance B; dev-bypass only exists in dev mode, so it can't sign in to a built server.)
- [x] 3.4 Seeding for Postgres per the spike (D6): `npm run seed` targets Postgres when configured, using the public seed by default. Verify a fresh Postgres database seeds and renders every sitemap page.

## 4. No source files at runtime

- [x] 4.1 Build the static route list from `import.meta.glob` (D5). `scanStaticPageRoutes` and `manifestSources` take that list instead of reading the disk. Verify the existing sync unit tests pass (adapted to the new input), and that the built server started from a directory with no `src/` logs no `ENOENT` and syncs.

## 5. Health endpoints

- [x] 5.1 Add `src/pages/healthz.ts` and `src/pages/readyz.ts` (D7): no-store, no localization or link rewriting, not in the sitemap. Verify with unit tests for the readiness logic (db or storage failing → 503), and an e2e check that both answer 200 and `/es/healthz` isn't served.

## 6. Container

- [x] 6.1 Add the `Dockerfile` (multi-stage, Node 22, non-root, `HEALTHCHECK /healthz`, build args `DB_ADAPTER=postgres` and `STORAGE=s3`), `.dockerignore` (no `.env`, `data.db`, `uploads/`, `seed/seed.local.json` or `scripts/migrate/snapshot/` child data), and `docker-compose.yml` (app, postgres, minio and bucket init; D6). Verify that `docker compose up` serves the seeded site on Postgres + MinIO, that `/readyz` is 200, and that the image contains no `src/`, `.env` or child data (inspect its layers).

## 7. Portable data

- [x] 7.1 Add `scripts/data-export.mjs` and `scripts/data-import.mjs` (`npm run data:export` / `data:import`; D8), with a default output outside the repository and repository paths refused. Verify: export a scratch copy of the local SQLite + disk site, import it into compose Postgres + MinIO, and compare page HTML for every sitemap page and the database row counts. Check that a path inside the repository is refused.

## 8. CI

- [x] 8.1 Add the `container` job to `.github/workflows/test.yml` (D9): Postgres + MinIO services, build the image, seed, run it, and run the e2e suite against it. Verify the job passes on the PR and fails on a deliberately broken Postgres query in a throwaway commit (not pushed to the PR). (Simulated locally, step for step, from a clean copy without `.env` or the local seed: 66 passed, 5 skipped for child data and tokens, 2 media-seeded tests excluded by design. Putting back the `partner: true` bug fails the 2 new partner-logo tests. The run on GitHub follows the push.)

## 9. Docs and wrap-up

- [x] 9.1 Add a "Running anywhere" page to docs-site (image, variables, local stack, seeding, export/import, safeguarding note on exports) and add it to the sidebar. Update the README and `.env.example`. Verify the docs build.
- [x] 9.2 Run the unit tests, Storybook tests, the e2e suite on SQLite and on the container (Postgres + MinIO), and the menu check, then report the results.

## 10. Dev container (added at the user's request)

- [x] 10.1 Name the dev container ("VVF dev container"; Docker name `vvf-dev-container`), give it its own `node_modules` volumes (root and `docs-site/`) and Docker access through the docker-outside-of-docker feature (`moby: false`, since the Node 22 image is Debian 13). Verified with the Dev Containers CLI:
  - the container's `node_modules` starts empty and gets Linux-only builds, while the host's stays untouched;
  - Docker 29.8 and Compose v5.6 work inside and see the host's containers;
  - `docker compose config` reads the stack.

  A full `astro build` inside was killed for memory (Docker Desktop has 7.7 GB, shared with other running containers), which is documented.

