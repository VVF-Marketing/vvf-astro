## Why

A Postgres + S3 environment seeded with `npm run db:setup` has no images or PDFs: event photos, team photos, resource covers and report downloads are all missing. The public `seed/seed.json` carries no media at all, because media values hold database-specific IDs and storage keys that are only known after `npm run seed` uploads the files through a running dev server (into SQLite only). Staging and preview environments will be seeded this way, so they'd look broken, and a compose-based dev container on Postgres isn't usable until this is fixed. CI also has to skip two e2e tests on Postgres for the same reason.

Not tied to a Basecamp card: it follows from `make-app-portable` (PR #25), which this change builds on.

## What Changes

- **Stable media values in the public seed.** Each public media file (events, resources, team members and sponsors; never children) gets an ID and storage key derived from its file, so the same values work in every database. `seed/seed.json` carries complete image and file values, including alt text and dimensions.
- **One media step for every database.** A shared script uploads the referenced files from `seed/media/` to the configured storage (disk or S3) under those keys and creates their media rows. Both `npm run db:setup` (Postgres) and `npm run seed` (SQLite) use it. `npm run seed` no longer needs a temporary dev server to upload media.
- **Children stay local.** Child media keeps the same mechanism but its manifest and files stay gitignored, so it's only seeded where the local child snapshot exists. Nothing about children enters `seed/seed.json` or any image.
- **The tools image can seed media.** `.dockerignore` lets the public `seed/media/` folders into the build context (children and the local media map stay excluded). The runtime image is unchanged.
- **CI covers media on Postgres.** The container job's two skipped media tests run again.
- Docs (`running-anywhere.md`, `docker-compose.yml` comments) describe seeding with media.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `deployment-portability`: new requirement that a freshly seeded environment, in either database and storage mode, includes the public media. This capability is introduced by `make-app-portable`, which must be archived first.

## Impact

- **Code:** `scripts/migrate/transform.mjs` (writes stable media values), `scripts/migrate/media.mjs` (stable IDs), a new shared seed-media module, `scripts/db-setup.mjs`, `scripts/seed.mjs`.
- **Data:** `seed/seed.json` grows by the media values. Existing databases are unaffected: `db:setup` still seeds only an empty database, and existing media keeps its IDs. Local SQLite databases get the new IDs the next time `npm run seed` runs.
- **Build:** `.dockerignore` and the `tools` image gain about 50 MB of public media; the `runtime` image is unchanged.
- **CI:** `playwright.container.config.ts` drops its `grepInvert`.
- **Safeguarding:** the public/child boundary must hold: no child file, alt text or ID in `seed/seed.json`, the build context or any image (checked by a test).
