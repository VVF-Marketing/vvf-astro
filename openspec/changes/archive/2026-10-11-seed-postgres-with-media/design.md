## Context

Today media reaches content in two steps, and only on SQLite:

```
npm run seed (SQLite only)
  transform.mjs -> seed.json (no media)  -> emdash seed (schema)
  dev server on :4398 -> media.mjs uploads seed/media/** via the admin API
       -> EmDash picks ULID ids + storage keys
       -> seed/media/emdash-media.local.json (url -> media value, gitignored)
  transform.mjs again -> seed.local.json (with media) -> emdash seed --on-conflict=update

npm run db:setup (Postgres)
  migrations -> applySeed(seed.json)   # no media at all
```

The media values in content (`{ provider: 'local', id, width, height, mimeType, filename, meta.storageKey, alt }`) carry IDs that EmDash generated during that upload, so they only exist in that one database. That's why the public `seed/seed.json` has no images, and why `db:setup` produces a site without them.

Relevant facts:
- **Public media is already in git:** `seed/media/{events,resources,sponsors,team_members}` (117 files, about 50 MB), described by `seed/media/manifest.json` (source URL -> path, alt, content type).
- **Child media is gitignored:** `seed/media/children/` and its own `manifest.json` stay local.
- **SVGs (sponsor logos)** are already handled as static files under `public/images/media` with `provider: 'external'`, so they're stable and need no change.
- **EmDash's seed `$media`** only downloads http(s) URLs, behind an SSRF check. It can't read local files, and it picks a random ID on every run, so it doesn't solve this.
- **EmDash exports the storage adapters** (`emdash/storage/s3`, `emdash/storage/local`), already used by `media-copy.mjs` and `data.mjs`.
- **The `media` table** is plain: `id, filename, mime_type, size, width, height, alt, caption, storage_key, content_hash, status, ...`. `data.mjs` already writes tables directly.
- **The tools image** can't see `seed/media/` today (`.dockerignore`).

## Goals / Non-Goals

**Goals:**
- A freshly seeded Postgres + S3 environment has the same images and PDFs as a freshly seeded SQLite site.
- Media values in the public seed are identical in every environment.
- One media-seeding path for both databases, with no dev server needed.
- The public/child boundary is enforced by a test, not by convention.

**Non-Goals:**
- Re-keying media in existing databases (the user's local CMS, a future production database). Their media rows keep their IDs; this only affects new seeds.
- Changing how editors upload media in the admin.
- Seeding child media anywhere except a local machine with the child snapshot.
- Image optimization, blurhash or dominant colours. EmDash's admin upload may compute these; seeded rows leave them empty, as rows from a `data:import` of old media would.

## Decisions

### D1. Stable media IDs and storage keys, derived from the file

Each media file gets:
- **An ID:** a 26-character string in EmDash's ULID alphabet (Crockford base32), built from the SHA-256 of the file's repo-relative path.
- **A storage key:** `<id>.<ext>`, the same shape EmDash uses for uploads.

The ID is derived from the *path*, not the content, so replacing a photo's file keeps its ID and every reference to it. The content hash still goes in `content_hash`.

Keeping the ULID shape means nothing in EmDash or the admin that expects a ULID-looking ID is surprised. Task 1.1 found that EmDash 0.38 doesn't validate media IDs: there's no `.ulid()` schema and no timestamp decoding, and files are served by storage key. The first character is still kept at `7` or below, so every ID is also a valid ULID.

**Alternatives considered:**
- Random IDs plus a committed map. Rejected: that's the current problem, moved into git.
- EmDash `$media` with URLs. Rejected: it needs the files served over http, does an SSRF check, and generates new IDs on every run.
- Content-hash IDs. Rejected: replacing an image would orphan its references.

### D2. `transform.mjs` writes complete media values without a database

`transform.mjs` builds the media map itself from the manifests, instead of reading the gitignored `emdash-media.local.json` that the dev-server upload wrote:
- **Public manifest:** goes into both `seed.json` and `seed.local.json`.
- **Child manifest:** goes into `seed.local.json` only, and only when the child manifest exists locally.

Width and height come from `sharp` metadata, already a dependency. Alt text comes from the manifest. The output is deterministic, so regenerating `seed.json` with unchanged files gives no diff.

### D3. A shared `seedMedia` step

New module: `scripts/lib/seed-media.mjs`, exporting `seedMedia({ db, storage, manifests })`. For each non-SVG manifest entry under `seed/media/`, it:
1. derives the ID and key (D1);
2. skips the entry if a media row with that ID already exists;
3. otherwise uploads the file to the storage with that key and inserts the media row.

The upload happens before the row insert, so a crash never leaves a row that points at a missing file. Re-running the step after a crash fills in what's missing, which makes it safe to repeat.

The step is used in two places:
- **`db-setup.mjs`:** migrations, then `seedMedia` (public manifest), then `applySeed(seed.json)`. Still only into an empty database, or with `--force`. Storage is chosen like the site's: `STORAGE=s3` gives `createS3Storage({})`, otherwise local `uploads/`.
- **`seed.mjs` (SQLite):**
  1. remove `data.db` and `uploads/`;
  2. run `transform` (writes `seed.json` and `seed.local.json`; the child entries are empty without the child snapshot);
  3. apply `seed.local.json` with `emdash seed`, which also creates and migrates the database;
  4. run `seedMedia` (public, plus child when present) into `uploads/`.

  Content stores media values, not foreign keys, so applying content before the media rows is safe. The dev-server upload is no longer needed, and neither is `emdash-media.local.json`.

`scripts/migrate/media.mjs` (`importMedia`) is replaced (task 2.4). It was only used by `seed.mjs` and the migration's `media` step, which now just copies harvested SVGs to `public/images/media/`.

### D4. Children are excluded by construction, and checked by a test

- The public manifest (`seed/media/manifest.json`) is the only input to `seed.json` and to `db:setup`.
- The child manifest lives under the gitignored `seed/media/children/`.
- `.dockerignore` keeps excluding `seed/media/children/` and `emdash-media.local.json`, while allowing the public folders and the public manifest.

A unit test fails if:
- `seed/seed.json` contains any path, ID or alt text from `seed/media/children/` (when present locally), or any `children` media path;
- `.dockerignore` stops excluding `seed/media/children/`.

### D5. The tools image carries public media; the runtime image doesn't

The `tools` stage copies the build context, which now includes the public `seed/media/` (about 50 MB). The `runtime` stage copies only `dist/`, the production `node_modules` and the launcher, so it's unchanged. Compose's `setup` job and CI's `db:setup` then seed media.

## Risks / Trade-offs

- **[A future EmDash validates media IDs as ULIDs]** → The IDs are valid ULIDs already (first character 7 or below); their decoded timestamps are meaningless, but nothing reads them.
- **[Existing local databases have different IDs than the new `seed.json`]** → No effect until they reseed. `db:setup` never seeds a non-empty database. Documented.
- **[`seed.json` diff noise]** → One large diff when values are first added; deterministic after that.
- **[Bigger tools image and build context]** → About 50 MB, acceptable for a one-off job image. Media could move to object storage later if it grows.
- **[Skipping rewritten files]** → If a seeded file is replaced but its row already exists, a re-run skips it (the row is keyed by path-derived ID). Acceptable: setup is for new environments. `--force` re-uploads.
- **[Removing the dev-server upload changes `npm run seed`]** → Verify with the same check as #25: the sitemap pages from the new `npm run seed` and from `db:setup` on Postgres + S3 must render identically, plus the full e2e suite on both.

## Migration Plan

1. Land behind the existing commands; no flags. The first `npm run seed` after merging gives local SQLite databases the new IDs. As before, it wipes `data.db`, so the usual warning about local edits applies (use `data:export` first if needed).
2. Environments seeded before this change keep working, with no images, until they're re-created. None exist yet beyond local Compose stacks: `docker compose down -v` and up again.
3. **Rollback:** revert the commit. Seeded media rows are ordinary rows and keep working.

## Open Questions

- ~~Should `npm run seed` keep `emdash-media.local.json`?~~ No. Only `seed.mjs`, `transform.mjs` and the migration `media` step used it, and all three now use stable values. `seed.mjs` deletes any leftover copy, and `.gitignore` still ignores it.
