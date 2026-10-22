---
title: Running Anywhere
description: One container image, configured at runtime, on Postgres and S3-compatible storage, with data you can move between hosts.
---

The site runs from one container image in every deployed environment: staging, previews and production. Its data moves between environments and hosts with one archive. No hosting provider is assumed; anything that runs a container with Postgres and an S3-compatible bucket works. The same app also builds for Vercel's functions instead of a container: see [Deploying to Vercel](/deploying-to-vercel/).

## Two modes

| | Local development | Deployed (container) |
| --- | --- | --- |
| Start | `npm run dev` | the image (`docker build -t vvf-site .`) |
| Database | SQLite, `./data.db` | Postgres (`DATABASE_URL`) |
| Media | disk, `./uploads` | S3-compatible bucket (`S3_*`), or a private Vercel Blob store on Vercel (`BLOB_READ_WRITE_TOKEN`) |
| Admin sessions | files | the database (`astro_sessions`) |

The database and storage kind are fixed when the site is built (`DB_ADAPTER=postgres`, `STORAGE=s3`; the Dockerfile sets both). Connection details and every secret are read when the server starts, never baked into the build (`astro:env`, `astro.config.mjs`). So the same image is promoted from staging to production, with only its environment variables changing.

The canonical site URL is deliberately fixed to the production address in every environment, so staging and preview copies never compete with production in search.

## Settings

Every variable is documented in `.env.example`. In deployed mode the launcher (`scripts/start.mjs`, the image's command) refuses to start with the names of any missing required settings:

- `DATABASE_URL` (and `DATABASE_SSL=true` for hosted databases);
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_REGION`, optional `S3_PUBLIC_URL`;
- optional `EMDASH_SYNC_PAT` (static-page sync), `SAFEGUARDING_USERS`, `DTD_PUBLIC_KEY`, `GTM_CONTAINER_ID` (Google Tag Manager; set in production only), `FORM_MAIL_API_KEY` (Resend; turns on the form emails), `FORM_MAIL_FROM`, `FORM_MAIL_TO`.

## Images

`docker build` has two useful targets:

- `runtime` (default): the site. It contains only the built server, production dependencies and the launcher, with no source tree, `.env`, local database or child data. It runs as a non-root user and declares a health check.
- `tools`: everything needed for one-off jobs: `npm run db:setup`, `npm run media:copy`, `npm run data:export` / `data:import`, and `npx emdash migrate`.

## Health

- `/healthz`: 200 while the server process is up. The image's `HEALTHCHECK` uses it.
- `/readyz`: 200 only when the database and media storage answer, otherwise 503 with `{ "db": …, "storage": … }`. Platforms should send traffic only to ready instances. It's what zero-downtime and blue/green deploys rely on.

Neither is cached or localized (there's no `/es/healthz`), and neither appears in the sitemap.

## The stack locally

```bash
docker compose up --build             # site on http://localhost:4321
SITE_PORT=4399 docker compose up --build   # if 4321 is taken by npm run dev
docker compose down -v                # stop and delete the local data
```

Compose runs the site image, Postgres 16 and SeaweedFS (an S3-compatible store; MinIO's images are no longer published). A `setup` job creates the bucket, migrates the database and seeds the public `seed/seed.json` with its media (no child data).

## A new environment

1. Create an empty Postgres database and a bucket.
2. Migrate and seed: `npm run db:setup` (migrations, then the public media and seed, only into an empty database; `--no-seed` stops after migrations). It prints the target database and its fingerprint, and asks before migrating; `--force` (re-applying the seed over content) always asks. Set `STORAGE=s3` (with the `S3_*` settings) or `STORAGE=blob` (with `BLOB_READ_WRITE_TOKEN`) so the media goes to the storage the site reads; `STORAGE=local` uploads to `./uploads` instead, and leaving it unset is refused.

## Seeded media

The public seed carries complete image and file values. Each file in `seed/media/` (events, resources, team members, sponsors; never children) gets a media ID and storage key derived from its path (`scripts/lib/seed-media.mjs`), so the values are the same in every database. Seeding uploads the files to the configured storage under those keys and creates their media rows; files already seeded are skipped, so it's safe to re-run.

Databases seeded before this existed keep their own media IDs; they're never re-seeded (`db:setup` only seeds an empty database). Sponsor SVG logos are static files under `public/images/media/`, because EmDash's media library rejects SVGs.
3. Run the image with the settings above. Wait for `/readyz`, then send traffic.

Migrations are a deploy step. `npm run db:setup`, or `npx emdash migrate --from-config --expected-target-fingerprint=<fp>` from the tools image, applies pending EmDash migrations before the new version takes traffic.

`db:setup` migrates only a confirmed target. Without a terminal to ask in (the tools image, a deploy pipeline) it refuses unless the target is confirmed another way:

- **Pinned fingerprint (deploys):** set `EMDASH_TARGET_FINGERPRINT` in the environment's deploy settings to the fingerprint `db:setup` (or `npx emdash migrate --from-config --status`) printed for its database, once. A run against any other database, for example from a wrong `DATABASE_URL`, then stops with a mismatch error. `--expected-target-fingerprint=<fp>` does the same for one run.
- **`--yes` or `CI`:** for throwaway databases only, such as CI and the compose `setup` job.

## Moving data

```bash
npm run data:export                 # ~/vvf-exports/vvf-<timestamp>.tar.gz
npm run data:import -- <archive>    # into an empty, migrated database
```

The archive holds every database table (content, users, API tokens, revisions, drafts, menus, settings) and every media file. It works between any pair of modes, for example from a local SQLite + disk site to Postgres + S3. Source and target are chosen the same way as for the site (`DB_ADAPTER`, `STORAGE`; `--sqlite <file>` and `--uploads <dir>` for local paths).

The import runs in one transaction: if it fails, the target stays empty and can be retried. It never writes over an existing site: any row outside what migrations create (users, media, content...) makes it refuse. Retired collections (renamed for Postgres) aren't carried over, because their content already moved.

:::caution[Safeguarding]
Exports contain children's data and account data. They're written outside the repository by default (the script refuses a path inside it), readable only by you (file `0600`, a new folder `0700`), and never over an existing file. Store and delete them as safeguarding data, and never use them to fill preview environments: previews seed the public `seed/seed.json`.
:::

To copy only media, use `npm run media:copy`: from disk (`./uploads`, or `MEDIA_SOURCE_DIR`) by default, or from a bucket with `--from s3`, into `$STORAGE` (`s3` or `blob`), or the storage named with `--to`. It keeps the same keys, so content doesn't change, and it skips files already there, so it's safe to re-run. Check what's in the source first: a local `uploads/` from a migrated site holds child photos.

## Database differences to keep in mind

The e2e suite runs on both databases in CI: the `e2e` job on SQLite, and the `container` job on the image with Postgres + S3. Two differences have already bitten:

- **Booleans are 0/1 integers.** Filter with `1`, not `true`. Postgres rejects `integer = true`, and EmDash then returns no rows silently.
- **Postgres truncates names at 63 characters.** EmDash names indexes after the collection, so collection slugs must be 35 characters or fewer (`src/lib/collectionNames.test.ts` enforces it).
