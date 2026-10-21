## Context

See proposal.md (Why). Relevant facts:

- **EmDash's storage contract** (`emdash/src/storage/types.ts`):
  - `storage` is a descriptor `{ entrypoint, config }`, and the entrypoint exports `createStorage(config): Storage`;
  - `Storage` has `upload`, `download` (returning a stream, content type and size), `delete` (idempotent), `exists`, `list` (prefix, limit, cursor), `getSignedUploadUrl` (returning `{ url, method: 'PUT', headers, expiresAt }`), `getPublicUrl`, and an optional `getClientUploadOrigin` that the admin's CSP uses.
- **Keys:**
  - uploads are named `<ULID><ext>` (`media-upload.ts`);
  - backups are written under `backups/` (`api/handlers/backup.ts`), and the public media route refuses that prefix.
- **Serving:** `/_emdash/api/media/file/[...key]` downloads from storage and streams the body through the function. It sets `Cache-Control` (mutable for images, immutable for other types), a sandbox CSP, and `Content-Disposition`. EmDash's image endpoint also reads originals from storage.
- **Uploads:** `POST /_emdash/api/media/upload-url` asks storage for a signed PUT. The browser uploads directly, then confirms (`media/[id]/confirm`, which uses `exists`). When signed uploads aren't available, the admin falls back to a server upload, which is capped at 4.5 MB on Vercel.
- **Site tooling** opens storage through EmDash's adapters:
  - `scripts/media-copy.mjs` (local → S3);
  - `scripts/data.mjs` `openStorage()` (local or S3);
  - `scripts/lib/seed-media.mjs` (seed media);
  - `scripts/s3-bucket.mjs` (bucket creation, S3 only).
- **Vercel Blob** (`@vercel/blob`):
  - `put`, `head`, `del`, `list` (cursor), `get`/fetch by URL;
  - client uploads use short-lived client tokens (`generateClientTokenFromReadWriteToken`);
  - every store has its own `BLOB_READ_WRITE_TOKEN`;
  - a public store's URLs are `https://<store-id>.public.blob.vercel-storage.com/<pathname>`, which anyone can read once they know the pathname.

## Goals / Non-Goals

**Goals:**
- Blob as a third storage mode, with the same keys and the same media URLs in content.
- Large files on Vercel in both directions.
- No private file ever readable through a public Blob URL.

**Non-Goals:**
- Changing how content references media (`/_emdash/api/media/file/<key>` stays).
- Image transformations beyond what EmDash's image endpoint does today.
- Removing the S3 mode: the container and compose stack keep it.

## Decisions

### D0. Spike first
Against a test Blob store and the `run-on-vercel-functions` spike deployment, answer:
1. **Access modes:** can the store keep blobs private, readable only with the token? If yes, does reading them server-side add noticeable latency compared with a public blob fetch?
2. **Direct uploads:** can `getSignedUploadUrl` return what EmDash's admin expects? That's a single PUT with headers, built from a Blob client token scoped to that pathname, content type and maximum size, valid for a few minutes. Which origin does the CSP need (`getClientUploadOrigin`)?
3. **Serving size:** does the function's streamed media response serve a 20 MB PDF and a 10 MB image on Vercel? Does Vercel's CDN cache the response under the existing `Cache-Control` headers? Check `x-vercel-cache: HIT` on a second request.
4. **Keys:** does `put` with `addRandomSuffix: false` and `allowOverwrite` keep EmDash's key as the pathname exactly, including `backups/` subpaths? Does `list({ prefix, cursor, limit })` map cleanly?

Record the answers here. D2 and D3 below carry defaults that a spike answer can switch, so check with the user if the store layout changes.

### D1. The adapter: `src/lib/storage/vercelBlob.mjs`
`astro.config.mjs` adds `STORAGE=blob` → `{ entrypoint: <this file>, config: {} }`. The token is read from `process.env.BLOB_READ_WRITE_TOKEN` in `createStorage`, never put in the descriptor, because EmDash serializes descriptor config into the build (`make-app-portable` D0). The mapping:

| EmDash | Blob |
| --- | --- |
| `upload` | `put(key, body, { access, contentType, cacheControlMaxAge, addRandomSuffix: false, allowOverwrite: true })` |
| `download` | `get`/fetch the blob → `{ body: stream, contentType, size }`; a 404 becomes an error containing "not found" (the media route maps it to 404) |
| `delete` | `del` (ignores missing) |
| `exists` | `head` (404 → false) |
| `list` | `list({ prefix, limit, cursor })` → `{ files, nextCursor }` |
| `getSignedUploadUrl` | Blob client token for the key (per D0.2) |
| `getPublicUrl` | `/_emdash/api/media/file/<key>`, the same as the local adapter |

`getPublicUrl` returns the site's media route, not the Blob URL. That keeps content identical across modes and keeps the privacy decision (D2) in one place.

`scripts/lib/settings.mjs` requires `BLOB_READ_WRITE_TOKEN` when `STORAGE=blob`.

### D2. Store layout and privacy (default: one private store)
**Default:** if D0.1 confirms private blobs, use one private store per environment. Everything, backups included, is read only through the site, so the media route stays the single public door, and it already refuses `backups/`. Visitors never see a Blob URL.

**Fallback if private blobs aren't available:** two stores per environment.
- A public store holds media (ULID keys, 80 random bits, and the store can't be listed without the token).
- A private store, or a refusal, handles `backups/`: the adapter routes every key under `backups/` to a second token (`BLOB_PRIVATE_READ_WRITE_TOKEN`), or throws, so a misconfiguration fails closed.

Child photos in a public store would be as private as their URL, the same exposure as today, where the media route serves them to anyone holding the URL.

**Rejected:** a public store for everything. Backup names are predictable and hold child data.

### D3. Serving within Vercel's limits
**Default:** keep EmDash's streaming media route, and rely on the CDN caching it already asks for. If D0.3 shows streamed responses over 4.5 MB fail, the site's middleware answers `/_emdash/api/media/file/<key>` on the Vercel target with a short-lived redirect:
- to the public Blob URL (fallback layout), or
- to a signed download URL (private layout),

keeping the same headers policy (`Content-Disposition`, `nosniff`) where Blob allows it. Content URLs never change either way.

### D4. Direct uploads
`getSignedUploadUrl` returns the Blob client-upload request (per D0.2) with headers, and `getClientUploadOrigin` returns Blob's upload origin, so EmDash's admin CSP allows it. The token is limited to the one pathname, the declared content type and size, and a 10-minute expiry.

If D0.2 shows Blob's client upload can't be expressed as one PUT, `getSignedUploadUrl` throws "not supported". The admin then falls back to server uploads, and the site documents the 4.5 MB limit and tracks an upstream EmDash issue for pluggable client uploads. That fallback fails the "Large uploads" requirement, so it needs the user's sign-off.

### D5. Tooling
`scripts/data.mjs` `openStorage()` and `scripts/media-copy.mjs` gain a `blob` kind, using `vercelBlob.mjs`'s `createStorage`, so keys match what the site writes:
- `media:copy` takes `--from local|s3 --to s3|blob` (default local → `$STORAGE`);
- `seed-media.mjs` already uploads through the configured adapter, so it only needs the `blob` kind;
- `s3-bucket.mjs` is skipped when `STORAGE=blob`, because stores are created in Vercel.

### D6. Tests
- **Unit tests:** `vercelBlob.test.mjs` with `@vercel/blob` mocked covers every method's mapping, 404s, pagination, the token never in config, and `backups/` routing (the fallback layout).
- **Live check:** a `blob` CI step, only when `BLOB_TEST_TOKEN` is set, round-trips upload/exists/download/list/delete against the test store, and seeds public media into it under a per-run prefix that it then deletes.
- **E2E:** the full e2e run on Neon + Blob happens on Vercel previews (`add-vercel-deploy-pipeline`).

## Risks / Trade-offs

- **[EmDash's admin may assume S3-style signed PUTs]** → D0.2 proves it first. The fallback is explicit and needs the user's sign-off.
- **[Function bandwidth cost: every media byte passes through a function]** → The CDN cache (D0.3) makes repeat views free of function time. The redirect option exists if costs show up.
- **[Vendor lock-in for media]** → Keys and URLs are unchanged, and `media:copy` and `data:export` work in both directions, so moving back to S3 is a copy.
- **[Two tokens in the fallback layout]** → Both are required at startup when the layout needs them, so a missing one fails closed.

## Migration Plan

New environments are seeded straight into Blob (`npm run db:setup`). The production move (local CMS → Neon + Blob) is `move-production-to-vercel`, using `data:import`. Rollback: `media:copy --from blob --to s3`, then rebuild with `STORAGE=s3`.
