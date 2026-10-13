## Context

See proposal.md (Why). What the code does today:

- **Runtime config:**
  - `astro.config.mjs`: `output: 'server'`, `@astrojs/node` standalone, `emdash({ database: sqlite({ url: 'file:./data.db' }), storage: local({ … }) })`.
  - `@astrojs/node` turns on filesystem sessions; EmDash uses Astro sessions for admin sign-in (`src/astro/session-user.ts`, `middleware/auth.ts`).
- **EmDash adapters** (EmDash 0.38): `emdash/db` has `sqlite`, `libsql` and `postgres` (`connectionString`, `ssl`, `pool`); `emdash/storage/s3` reads `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION` and `S3_PUBLIC_URL` itself. The `emdash seed` CLI takes a SQLite path (`-d`).
- **Build-time secrets:** `src/middleware.ts` reads `import.meta.env.EMDASH_SYNC_PAT`. Vite inlines it at build, as we saw when a rotated token stayed in `dist/`. `src/lib/emdashGuard.ts` reads `SAFEGUARDING_USERS` through `import.meta.env` with a `process.env` fallback.
- **Runtime source scan:** `syncStaticPages` gets `pagesDir: process.cwd()/src/pages` and runs `scanStaticPageRoutes` with `readdirSync`. It also uses `manifestSources(…, process.cwd())`, which checks the files next to each manifest.
- **CI** (`.github/workflows/test.yml`): unit, Storybook and e2e on Node 22 against a freshly seeded SQLite database.
- **Data size today:** a 12 MB database and 55 MB of media.

## Goals / Non-Goals

**Goals:**
- One image for every deployed environment.
- Postgres + S3 in deployed environments; SQLite + disk locally.
- No disk state when deployed.
- Health endpoints.
- Export and import between any pair of modes.
- CI that proves all of the above.

**Non-Goals:**
- Choosing a host or writing deploy workflows.
- Preview environments and blue/green switching.
- Backups and scheduling.
- Moving off EmDash.
- Changing content or the editor experience.
- libSQL/Turso (EmDash supports it, but the design doesn't depend on it).

## Decisions

### D0. Spike first: runtime database config and seeding Postgres
Two facts decide the details of D2 and D6, and they're cheaper to test than to guess:
1. Does EmDash read the `postgres({ connectionString })` value at runtime, or serialize it into the build? If it's baked in, the config passes a runtime getter, or we read `process.env` in a small adapter wrapper.
2. How do you seed an empty Postgres database: EmDash's runtime seeding (`.emdash/seed.json` on first run, as `data.db` is seeded today), the `emdash seed` CLI against Postgres, or the seed API in a script?

Task 1.1 runs both against Postgres in docker-compose and records the answers here before the rest is built.

**Spike results (2026-10-05, Postgres 16, EmDash 0.38):**
- **(a) Connection string: baked in at build.** EmDash serializes the database descriptor's `config` into the build (`JSON.stringify` in `virtual:emdash/config`). So `astro.config.mjs` registers the descriptor from `postgres({})` with our own entrypoint, `src/lib/db/postgresRuntime.mjs`, which reads `DATABASE_URL`/`DATABASE_SSL` when the server starts and delegates to `emdash/db/postgres`. Verified: nothing about the connection is in the build.
- **Migrations are a deploy step.** `npx emdash migrate --from-config --expected-target-fingerprint=<fp>` reads `DATABASE_URL` at runtime. All 77 EmDash migrations apply cleanly to an empty Postgres database.
- **(b) Seeding:** `applySeed(db, seed, { includeContent: true })` from `emdash/seed`, with a Kysely instance on the runtime dialect. The public seed loads in about 5 seconds (33 collections, 348 fields, 1,535 entries, 2 menus). The `emdash seed` CLI is SQLite-only.
- **Blocker found: identifier length.** Postgres truncates identifiers to 63 characters; SQLite doesn't. EmDash names indexes `idx_ec_<collection>_<suffix>` (suffixes up to 21 characters, e.g. `_deleted_published_id`). The #21 slug `copy_resources_category_financials_transparency` (47 characters) makes two index names truncate to the same 63 characters, so seeding fails with `relation … already exists`. Collection slugs must stay at 35 characters or fewer. With that slug shortened, the full seed succeeds.
- **(c) Export:** `emdash export-seed` is SQLite-only and exports schema, settings, menus, bylines and content. It leaves out users, API tokens, revisions, drafts and media files, so it can't be the portable export (D8 needs a table-level copy instead).
- **Local S3:** `minio/minio` and `quay.io/minio/minio` images can't be pulled any more. SeaweedFS (`chrislusf/seaweedfs`, Apache-2.0, `weed server -s3`) works as the S3-compatible store for docker-compose and CI. Production can use any S3-compatible bucket.

### D1. Runtime configuration through `astro:env`
`env.schema` in `astro.config.mjs`. Server-side secrets use `context: 'server', access: 'secret'`, which Astro reads from `process.env` at runtime and never inlines:
- `EMDASH_SYNC_PAT`, `SAFEGUARDING_USERS`, `DTD_PUBLIC_KEY`;
- `DATABASE_URL`, `DATABASE_SSL`.

**Found while implementing:** Astro also checks *required* secrets at build time, so `DATABASE_URL` is optional in the schema. The container's launcher, `scripts/start.mjs`, checks the settings its mode needs (`DATABASE_URL` for Postgres, `S3_*` for S3) and exits with their names before starting the server. The site URL stays a build-time constant (`site` in `astro.config.mjs`) on purpose: canonical URLs point at production from every environment.

Code imports them from `astro:env/server`. S3 settings stay the `S3_*` variables EmDash reads itself. Validation fails fast at startup with the variable's name.

**Rejected:** keeping `import.meta.env` with a `process.env` fallback. That's easy to get wrong, and the build still inlines whatever is set when it runs.

### D2. The build picks the adapter; runtime supplies the connection
EmDash's adapter is set in the Astro config, which is evaluated at build time. `astro.config.mjs` picks `postgres(...)` when `DB_ADAPTER=postgres` at build, and `sqlite(...)` otherwise, keeping `npm run dev` unchanged. The deployed image is built once with `DB_ADAPTER=postgres`; `DATABASE_URL` comes from the environment at runtime (per D0). "Chosen by environment" therefore means: local builds use SQLite, and the container image uses Postgres. The spec's "same image for every deployed environment" holds, because all deployed environments are Postgres.

**Rejected:** bundling both adapters and choosing per request, which costs complexity and needs EmDash support for no real benefit.

### D3. Storage: `s3()` when `S3_BUCKET` is set, `local()` otherwise
This uses the same build-time switch as D2 (`STORAGE=s3` in the image build). EmDash's S3 adapter reads its `S3_*` variables at runtime. Media URLs keep going through `/_emdash/api/media/file/...` (EmDash serves or redirects), so stored content doesn't change between modes. `scripts/media-copy.mjs` copies every object from the local `uploads/` to the bucket, using EmDash's storage adapters so the keys match.

### D4. Sessions in the database (`db0`)
`session: { driver: 'db0', options: { database: … } }` uses the same Postgres in deployed mode (a separate sessions table), and the filesystem locally. No Redis to run, so nothing extra to host and nothing extra to lock you in.

**Rejected:** Redis (another service everywhere); filesystem sessions (signed out on every deploy, and broken behind two instances).

### D5. Route list built into the image
`src/middleware.ts` builds the static route list from `import.meta.glob('/src/pages/**/*.astro')` keys, as it already does for copy manifests. Those keys are resolved at build time, so no filesystem access is needed. `scanStaticPageRoutes` takes the list of files instead of a directory. `manifestSources` gets each manifest's page file from the same list instead of `existsSync`/`readdirSync`. The sync's behaviour and tests stay the same apart from that input.

### D6. Seeding and the local stack
`docker-compose.yml` runs:
- `app`: the image built from the Dockerfile;
- `postgres:16`;
- `minio`, plus a bucket-creation step.

Its `.env` defaults never hold real secrets. `npm run seed` gets a Postgres target per D0's answer, and seeds the public `seed/seed.json` (no child data) unless `seed.local.json` is passed explicitly.

### D7. Health endpoints
`src/pages/healthz.ts` returns 200 `ok`. `src/pages/readyz.ts` runs a trivial query (`select 1`) and a storage existence check with a short timeout, returning 200 or 503 with `{ db, storage }` booleans only. Both send `Cache-Control: no-store` and are excluded from the sitemap. The middleware skips localization and link rewriting for them, and `localeFromPath` never adds `/es` versions. The Dockerfile's `HEALTHCHECK` uses `/healthz`. Platforms use `/readyz` before switching traffic.

### D8. Export/import as one archive
`scripts/data-export.mjs` writes a `.tar.gz` holding:
- the database (EmDash `export-seed` with content, users, menus, settings and revisions where supported, or a raw `pg_dump`/SQLite copy, whichever D0 shows is complete);
- a `media/` folder;
- a manifest (version, counts, source mode).

`scripts/data-import.mjs` restores it into the configured target and verifies the counts. The default output is `~/vvf-exports/<timestamp>.tar.gz`. The script refuses any path inside the repository: these archives contain child data. Being able to import into an empty target is what makes moving hosts a copy-and-import.

### D9. CI container job
A new `container` job in `test.yml` with `services: postgres, minio`. It builds the image (`DB_ADAPTER=postgres`, `STORAGE=s3`), seeds the public seed into Postgres, runs the container, and points Playwright at it. The current SQLite jobs stay, so both modes are tested on every PR. The `drafts` spec needs a token, so the job mints a test token in the CI database only, just as local runs do against scratch databases.

### D10. Postgres-safe collection names (from the spike)
EmDash builds index names from the collection slug, and Postgres truncates identifiers at 63 characters. So collection slugs must be 35 characters or fewer (`idx_ec_` is 7 characters and the longest suffix 21). `COPY_PAGES` entries can set an explicit `slug`. `/resources/category/financials-transparency` uses `copy_resources_financials` instead of the derived 47-character name. A unit test simulates EmDash's index names for every collection and fails on any collision after truncation, so a future long page route can't break Postgres again.

Existing databases (the local CMS, any copy) still have the old collection. `migrate:copy-collections` treats it as a legacy source, like `page_copy`: it moves the rows (published values, open drafts, Spanish translation links) into the new collection and hides the old one. `npm run cms:schema` creates the new collection first.

### Found while implementing
- **Boolean filters broke on Postgres.** EmDash stores boolean fields as 0/1 integers. On SQLite `where: { published: true }` matches 1, but Postgres rejects comparing an integer with `true`, and EmDash swallows the error and returns no rows. Children and partner logos silently disappeared. The content adapter now filters with `1` (`CHILDREN_FILTER`, partners).
- **The import is one transaction.** A failure leaves the target empty and ready to retry, instead of half-filled.
- **Retired collections aren't imported.** A local CMS still holds the hidden `copy_resources_category_financials_transparency` (D10), which Postgres can't create. The import leaves `LEGACY_COLLECTIONS` out, since their rows already moved, and fails clearly on any other collection name too long for Postgres.
- **Verified round trip.** The local CMS on SQLite + disk (90 tables, 7,417 rows, 154 media files) was exported and imported into Postgres + S3 in the compose stack. All 84 sitemap pages (EN + ES) are byte-identical once per-render random IDs are ignored, and users, revisions, children, menus and tokens match row for row.
- **Fonts are fetched at build.** `astro build` downloads Google fonts (EmDash's admin uses Noto Sans), so an image build needs network access, and a failed fetch fails the build. A transient failure happened once. Self-hosting the fonts is a possible follow-up.

## Risks / Trade-offs

- **[EmDash's Postgres or S3 support is less used than SQLite]** → D0 spikes first. The CI container job runs the whole e2e suite on Postgres, so gaps show up as failures, not production surprises.
- **[SQLite and Postgres behave differently: case sensitivity, JSON, booleans as 1/0]** → The content adapter already copes with 1/0 booleans. Running e2e on both catches the rest.
- **[Build-time adapter choice: local and container builds differ]** → Intended and documented. The deployed image is the one tested in CI.
- **[`unstorage`'s `db0` driver is marked experimental]** → It's small (a key/value table). It's covered by a two-instance sign-in check, and swapping in the Redis driver would be a config change if it ever misbehaves.
- **[Exports leak child data]** → The repository path is refused, and the default lives in the home directory. Docs mark exports as safeguarding data. Previews never import exports; they seed the public `seed/seed.json`.
- **[Image size and build time]** → A multi-stage build copies only `dist/`, production `node_modules` and the `seed/` files needed for seeding.

## Migration Plan

Nothing changes for local development (SQLite + disk + `npm run dev`). The first deployed environment (staging, chosen later) is created by:
1. running the image with Postgres and S3 settings;
2. either seeding it, or importing an export of the current local CMS (`npm run data:export` → `npm run data:import`).

Rollback: any environment can be exported and re-imported elsewhere.

## Open Questions

- Should deployed exports run on a schedule, as backups? That goes with choosing a host.
