## Why

The site has no host yet, and the team wants staging, ephemeral per-PR environments and blue/green production deploys without being locked into one provider. The hosting choice comes later. What blocks every option today is that the app isn't portable:

- **State lives on local disk:** the SQLite database (`data.db`), uploaded media (`uploads/`) and Astro sessions (filesystem driver). Only one server can run the site, and moving it means copying files by hand.
- **Secrets are baked in at build time:** `import.meta.env.EMDASH_SYNC_PAT` is inlined into `dist/`. One built image can't be promoted from staging to production with different secrets.
- **The running server reads source files:** the static-page sync scans `process.cwd()/src/pages`, so a production image without `src/` logs `ENOENT` and skips the sync.
- **No container, no health checks, no export/import path.**

This change builds that foundation. Choosing a host and setting up deploy pipelines, previews and blue/green are follow-ups.

## What Changes

- **Container image:** a multi-stage `Dockerfile` (Node 22, non-root, health check) and a `docker-compose.yml` that runs the deployed stack locally: app, Postgres and an S3-compatible store (MinIO).
- **Runtime configuration:** every secret and setting is read when the server starts, through Astro's `astro:env` schema, not at build time. One image runs in any environment. `.env.example` documents each variable.
- **Database chosen by environment:**
  - **Postgres** (`DATABASE_URL`) for any deployed environment;
  - **SQLite** (`./data.db`, today's default) for zero-setup local development.

  Seeding and EmDash migrations work on both, and CI tests both.
- **Media storage chosen by environment:** an S3-compatible bucket (EmDash's `s3` adapter, `S3_*` variables) or local disk (today's default). A script copies existing media between them.
- **No state on local disk when deployed:** sessions use the configured database (Astro's `db0` session driver), and the static-page sync uses a route list built into the image instead of scanning `src/pages`.
- **Health endpoints:** `/healthz` (the process is up) and `/readyz` (database and storage reachable). Every platform's zero-downtime and blue/green deploys rely on these.
- **Portable data:** `npm run data:export` and `npm run data:import` move the full database plus media between environments (e.g. SQLite + disk → Postgres + S3), so changing hosts is copy, import, point DNS.
- **CI** builds the image and runs the e2e suite against it on Postgres + MinIO, so portability is tested on every PR.

**Out of scope:** choosing a host, deploy workflows, preview environments, blue/green switching, backups and scheduling.

## Capabilities

### New Capabilities
- `deployment-portability`: how the site runs from one container image in any environment: runtime configuration, choice of database and media storage, no local state when deployed, health endpoints, data export/import, and CI that proves it.

### Modified Capabilities
<!-- none: the static-page sync's behaviour is unchanged; only where it gets the route list moves (design D5) -->

## Impact

- **Code:**
  - `astro.config.mjs` (env schema, database, storage and session selection)
  - `src/middleware.ts` (runtime secrets; route list for the sync)
  - `src/lib/emdashGuard.ts` (runtime `SAFEGUARDING_USERS`)
  - `src/lib/staticPageSync.ts` (route list input)
  - new `src/pages/healthz.ts` and `src/pages/readyz.ts`
  - new `scripts/data-export.mjs` and `scripts/data-import.mjs`
  - `scripts/seed.mjs` (Postgres target)
- **New files:** `Dockerfile`, `.dockerignore`, `docker-compose.yml`.
- **CI:** `.github/workflows/test.yml` gains a container job with Postgres + MinIO.
- **Dependencies:** `pg` (EmDash's Postgres adapter), `db0` (session driver). Both are used through EmDash and Astro rather than called directly.
- **Docs:** a new `docs-site` page, "Running anywhere" (image, variables, local stack, export/import); README; `.env.example`.
- **Safeguarding:** exports include child data, so the export is never committed and its docs say so. Previews (later) keep seeding from the public `seed/seed.json`.
- **Stack:** PR 13, based on `stack/12-report-date-badge` (#24).
