## Why

The foundation wants the site's data in Vercel, and that includes media: event and team photos, resource covers, report PDFs, and child photos uploaded by safeguarding staff. Today the deployed build stores media in an S3-compatible bucket through EmDash's `s3()` adapter. Vercel Blob has no S3 API, and EmDash 0.38 ships only `local` and `s3` storage adapters (`emdash/storage/*`), so the site can't use Blob yet.

Vercel's functions also limit request and response bodies to 4.5 MB. Large report PDFs therefore can't be uploaded through the server, and serving media through a function needs checking. EmDash also keeps full-site backups (child data included) in the same storage under `backups/`, so how Blob exposes files is a safeguarding question, not only a technical one.

Depends on `run-on-vercel-functions`. Basecamp card: _link the hosting card here when the change is started._

## What Changes

- **A Vercel Blob storage adapter for EmDash:** `STORAGE=blob` at build selects it. It reads `BLOB_READ_WRITE_TOKEN` at runtime and implements the whole EmDash storage interface (upload, download, delete, exists, list, signed upload, public URL). `local` and `s3` stay for development and the container.
- **Direct uploads from the browser:** the CMS admin uploads files straight to Blob, so files over 4.5 MB (report PDFs) upload on Vercel. The admin's content security policy allows the Blob upload origin.
- **Media served within Vercel's limits:** images and documents of any size keep loading at their existing `/_emdash/api/media/file/...` URLs, with CDN caching. Stored content doesn't change.
- **Private by default:**
  - backups and other non-public files are never readable through a public Blob URL;
  - child media follows the same access rules as on S3;
  - the store layout (private store, or a public store plus a private one) is decided by the spike.
- **Tooling targets Blob:**
  - `npm run media:copy` copies from disk or S3 to Blob;
  - `npm run db:setup` seeds the public seed's media into Blob;
  - `npm run data:export` / `data:import` read from and write to Blob.
- **Tests:** unit tests against a mocked Blob SDK. CI also runs a live check against a dedicated test store, holding public seed media only.

## Capabilities

### New Capabilities
<!-- none: Blob is another storage mode of deployment-portability -->

### Modified Capabilities
- `deployment-portability`:
  - "Media storage chosen by environment" adds Vercel Blob, large uploads and the media-privacy rules;
  - "Seeded environments include public media" adds the Blob storage mode;
  - "Portable data" covers export and import with Blob on either side.

## Impact

- **Code:**
  - new `src/lib/storage/vercelBlob.mjs` (EmDash `createStorage` entrypoint);
  - `astro.config.mjs` (the `STORAGE=blob` branch);
  - `src/middleware.ts` (media route behaviour on Vercel, if the spike needs it);
  - `scripts/media-copy.mjs`, `scripts/lib/seed-media.mjs`, `scripts/data.mjs`, `scripts/start.mjs`/`src/lib/settings.mjs` (required `BLOB_READ_WRITE_TOKEN`);
  - `src/pages/readyz.ts` is unchanged (it already uses `storage.exists`).
- **Dependencies:** `@vercel/blob`.
- **Environment variables:** `STORAGE=blob` (build), `BLOB_READ_WRITE_TOKEN` (runtime; one per store), and a second token if the spike picks two stores. Documented in `.env.example`.
- **CI:** a `BLOB_TEST_TOKEN` GitHub secret for a test-only store.
- **Docs:** `deploying-to-vercel.md` (media section), `running-anywhere.md` (storage modes table).
- **Safeguarding:**
  - child photos and backups must stay unreadable without the access the S3 setup gives them today;
  - the CI store only ever holds public seed media.
