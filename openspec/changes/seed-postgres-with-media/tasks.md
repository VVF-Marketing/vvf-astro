## 1. Stable media values

- [x] 1.1 Check whether EmDash validates media IDs (media API routes, admin media library, image endpoint) beyond "string". Pick the ID form accordingly (D1, or the fixed-timestamp ULID fallback) and note the result in design.md.
- [x] 1.2 Add `scripts/lib/seed-media.mjs` with `mediaIdFor(relPath)` and `storageKeyFor(relPath)`, plus unit tests: deterministic, ULID alphabet and length, extension kept, different paths give different IDs.
- [x] 1.3 Add `mediaValueFor(entry)`: reads dimensions with `sharp` and returns the full media value (provider, id, alt, width, height, mimeType, filename, `meta.storageKey`). SVGs keep the existing static/external value. Unit test with a small fixture image.

## 2. Seed files carry media

- [x] 2.1 Change `transform.mjs` to build its media map from the manifests via `mediaValueFor`, instead of `emdash-media.local.json`: the public manifest for `seed.json`; public + child for `seed.local.json`, only when the child manifest exists.
- [x] 2.2 Regenerate `seed/seed.json`. Check it has images for events, resources (covers and PDFs), team members and sponsors, and that regenerating again gives no diff.
- [x] 2.3 Add the safeguarding test (D4): `seed/seed.json` contains no `seed/media/children` path, and none of the child IDs, filenames or alt text when the child manifest is present; `.dockerignore` still excludes `seed/media/children/` and `emdash-media.local.json`.
- [x] 2.4 Find every remaining use of `emdash-media.local.json` and `importMedia`. Remove what the new flow replaces, and update or keep the rest with a reason. Resolve the open question in design.md.

## 3. One media step for both databases

- [x] 3.1 Implement `seedMedia({ db, storage, manifests })` (D3): skip existing IDs, upload then insert, return counts. Unit-test it against a temporary SQLite database and local storage directory: first run uploads all, second run uploads none, and a deleted file in storage is re-uploaded on a re-run with `--force`.
- [x] 3.2 `db-setup.mjs`: choose storage like the site (`STORAGE=s3` gives `createS3Storage({})`, otherwise local `uploads/`). Run `seedMedia` with the public manifest before `applySeed`, only when seeding. Log the media counts.
- [x] 3.3 `seed.mjs` (SQLite): replace the dev-server upload with `seedMedia` (public plus child when present) and a single seed apply. Keep the Postgres branch delegating to `db-setup.mjs`.
- [x] 3.4 `.dockerignore`: allow the public `seed/media/` folders and `manifest.json`; keep `seed/media/children/` and `emdash-media.local.json` excluded. Check with a build-context listing that no child path is included.

## 4. CI and docs

- [x] 4.1 Remove the `grepInvert` (and its comment) from `playwright.container.config.ts`, so the media tests run on Postgres + S3.
- [x] 4.2 Update `running-anywhere.md` (setup seeds media; existing databases keep their IDs), the `docker-compose.yml` header comment, and the `npm run seed` description in the Getting Started scripts table if it mentions the dev server.

## 5. Verification

- [x] 5.1 Fresh `npm run seed` in a scratch copy (never the user's `data.db`): `npm run test:e2e` passes, and the site renders event, team and resource images and downloads PDFs.
- [x] 5.2 `docker compose down -v && docker compose up --build` (on a spare `SITE_PORT`): the site shows the same images; the container e2e suite passes with no tests skipped for media.
- [x] 5.3 Compare all sitemap pages between the fresh SQLite seed and the Compose stack (same method as `make-app-portable`): identical apart from host.
- [x] 5.4 Run `setup` a second time against the Compose stack: no new uploads or rows. Run `npm run test:unit`, the full `npm test` only in a scratch copy (it reseeds `data.db`), `openspec validate seed-postgres-with-media --strict` and the docs build.

## Verification notes

- **5.1** Fresh SQLite seed in a scratch copy: 154 files (public + local child media) uploaded in about 2 s, with no dev server.
  - Container e2e config against it: 72 passed, 2 skipped (the admin sidebar tests, which skip outside dev). The drafts test was excluded: it reads `.env`'s API token, which a fresh database doesn't have.
  - Crawl: 166 pages, 153 media URLs, all 200.
- **5.2** Compose stack on Postgres + SeaweedFS: `Media: 114 uploaded`; `/readyz` 200.
  - Both former `grepInvert` media tests pass.
  - Three children tests fail locally only: they detect children from the local child snapshot, but the stack uses the public seed. CI has no child files, so they skip there.
  - Crawl: 86 pages, 113 media URLs, all 200.
- **5.3** 86 common pages compared, with host and per-render element IDs normalized: 82 identical. The 4 that differ are the Sponsor a Child listings (the scratch SQLite site had local children).
- **5.4** Normal re-run: seed skipped, 114 rows. `--force`: 114 files re-uploaded, still 114 rows.
  - Unit tests: 483 passed. Docs build OK. Strict validation OK.
  - `tsc` reports 2 errors in `src/lib/staticPageSync.test.ts`, which this change doesn't touch.

