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

**Spike results (2026-10-22, `@vercel/blob` 2.8.2, private store `vvf-astro-spike-media` in `iad1` on the foundation's team, connected to `vvf-astro-spike` production; scripted from a laptop under `spike-d0/` prefixes, all deleted afterwards):**
- **(1) Private: yes.** Stores are created `--access private`; blobs live on `<store>.private.blob.vercel-storage.com`. An anonymous GET of a blob's `url` and of its `downloadUrl` both answer **403**. With the token, `get(pathname, { access: 'private' })` returns `{ statusCode, stream, blob: { contentType, size } }` in 60–160 ms from the laptop (from `iad1` it should be less; measure on the deployment in (3)). A missing blob: `get` returns `null`, `head` throws `BlobNotFoundError`. D2 stands: one private store, no public fallback.
- **(2) Direct uploads: yes, as one PUT.** `issueSignedToken({ pathname, operations: ['put'], allowedContentTypes, maximumSizeInBytes, validUntil })` then `presignUrl(token, { access: 'private', operation: 'put', pathname, …, addRandomSuffix: false, allowOverwrite: true })` gives a URL on **`https://vercel.com`** (the CSP origin for `getClientUploadOrigin`), with the limits in signed query parameters. CORS allows any origin for PUT. That maps onto EmDash's `SignedUploadUrl` (`{ url, method: 'PUT', headers, expiresAt }`), with `headers: { 'x-content-type': contentType }`. Enforced by Blob, each tried: a different pathname (403 "pathname does not match delegation"), one byte over the size (403), a disallowed `x-content-type` (403), and editing the allowed types in the URL (403, the signature covers them). Blob ignores `Content-Type` for the stored type: without `x-content-type` it infers the type from the extension, so a forged `Content-Type: text/html` on a `.png` key is stored as `image/png`. A client adding `x-add-random-suffix` is ignored. **Without `addRandomSuffix: false` in the presign, Blob appends a suffix** (`01UPLOAD-vpfH….png`) and the key no longer matches EmDash's.
- **(4) Keys and list: yes.** `put` with `addRandomSuffix: false` keeps the key exactly, nested `backups/…` included, and `allowOverwrite: true` replaces. `list({ prefix, limit, cursor })` pages with `hasMore` and `cursor`, mapping to `{ files, nextCursor }`.
- **(3) Serving size: yes. CDN caching: no.** Measured with the adapter (`STORAGE=blob`, built with `vercel build`, the token in the build env and absent from `.vercel/output`) deployed on the spike, with the 130 public seed files plus a 20 MB PDF and a 10 MB JPEG in the store:
  - The streamed media route serves past Vercel's 4.5 MB body limit: the 20 MB PDF in full (200, `Content-Disposition: attachment`, about 2 s to the laptop), the 10 MB JPEG `inline` (about 1 s). D3's default holds; the presigned-GET redirect isn't needed. (For the record: a 5-minute presigned GET is fetchable anonymously, 200 with `cache-control: private`, and the same URL for another pathname is 403.)
  - `backups/…` and a missing key both answer 404 through the route.
  - Pages render: 58 media images on `/`, 52 on `/es/events/2025-golf-tournament`, 9 on `/resources`, none broken. With the photos present, the Spanish golf page no longer scrolls sideways (the 97 px in `run-on-vercel-functions` D0 came from the missing photos).
  - **Nothing is cached at Vercel's CDN** (`x-vercel-cache: MISS` on every repeat). EmDash sends images `Cache-Control: public, max-age=0, must-revalidate`, which is never cacheable, and other files `public, max-age=31536000, immutable`, which Vercel's CDN doesn't honour for function responses without `s-maxage` or `Vercel-CDN-Cache-Control`. So every image view is a function invocation plus a Blob read (0.2–0.4 s per image here; the homepage is 58). The route sends no `ETag`, so a browser re-downloads images in full on each visit too. D3 assumed the CDN would cache; it needs a decision (see Open Questions).

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

### D2. Store layout and privacy: one private store, no public fallback
One **private** store per environment. Everything, backups and child photos included, is read only through the site, so the media route stays the single public door, and it already refuses `backups/`. Visitors never see a Blob URL. Deleting a file or rotating the store's token cuts off access, and every read goes through a function, where it can be logged.

**If D0.1 shows Blob can't keep files private, the change stops there and goes back to the user.** It does not fall back to a public store. The proposed alternative is a private S3-compatible bucket, outside Vercel, behind the same media route; that's `STORAGE=s3`, which already works.

**Rejected:** a public store for media with backups routed to a private one (the earlier fallback). When a file is uploaded, the adapter can't tell a child photo from any other image, so child photos would land in the public store. A public Blob URL can't be revoked or audited, and keeps working after a profile is unpublished. Raised in Eduardo's review on #32. Also rejected: a public store for everything, since backup names are predictable and hold child data.

### D3. Serving within Vercel's limits
**Default:** keep EmDash's streaming media route, and rely on the CDN caching it already asks for. If D0.3 shows streamed responses over 4.5 MB fail, the site's middleware answers `/_emdash/api/media/file/<key>` on the Vercel target with a short-lived redirect to a signed download URL for the private blob (minutes, not days), keeping the same headers policy (`Content-Disposition`, `nosniff`) where Blob allows it. Content URLs never change either way.

**After D0.3 (decided with the user, 2026-10-22):** streaming works past 4.5 MB, so the route stays and there's no redirect. The CDN doesn't cache it on its own, though, so on the Vercel target the middleware adds `Vercel-CDN-Cache-Control: max-age=600, stale-while-revalidate=3600` to the media route's 200 responses (`src/lib/mediaCdnCache.ts`). Only Vercel's CDN reads that header; browsers keep EmDash's `Cache-Control`. The window is short on purpose: a removed or replaced file, a child's photo included, can still be served from the CDN for up to 10 minutes, plus one stale response while it revalidates. `vercel cache purge --type cdn` clears it at once, for urgent removals. Longer caching with a per-file purge on delete (cache tags, a Vercel API token at runtime) was offered and not chosen; no CDN cache at all was the other option.
- **Measured on the spike:** a 200 KB image and a 4.8 MB PDF become `x-vercel-cache: HIT` on the second request (0.1–0.2 s against 0.4–0.5 s uncached). The 10 MB and 20 MB test files are never cached: Vercel's CDN skips responses above a size between 4.8 and 10 MB. They're still served in full, through the function each time. Errors (404s, `backups/…`) are never cached.

### D4. Direct uploads
`getSignedUploadUrl` returns the Blob client-upload request (per D0.2) with headers, and `getClientUploadOrigin` returns Blob's upload origin, so EmDash's admin CSP allows it. The token is limited to the one pathname, the declared content type and size, and a 10-minute expiry.

**Verified on the spike (2026-10-22):** a 19.3 MB PDF and a 6 MB PNG uploaded through the admin's media library, straight to Blob (both over the functions' 4.5 MB request limit), confirmed as `ready`. Each is stored under EmDash's key with its exact size and type, and reads back through the media route byte for byte (SHA-256). The admin's CSP is `connect-src 'self' https://vercel.com`. An expired link is refused (403 "delegation has expired"). **A link could be reused** while it was valid: the same PUT replaced the file again, which would let whoever holds it change a file after the admin confirmed it. EmDash gives every upload a new key, so the signed link now sets `allowOverwrite: false`: a second use is refused (400 "This blob already exists") and the file is unchanged. Server-side `upload` keeps overwriting, which re-seeding needs.

If D0.2 shows Blob's client upload can't be expressed as one PUT, `getSignedUploadUrl` throws "not supported". The admin then falls back to server uploads, and the site documents the 4.5 MB limit and tracks an upstream EmDash issue for pluggable client uploads. That fallback fails the "Large uploads" requirement, so it needs the user's sign-off.

### D5. Tooling
`scripts/data.mjs` `openStorage()` and `scripts/media-copy.mjs` gain a `blob` kind, using `vercelBlob.mjs`'s `createStorage`, so keys match what the site writes:
- `media:copy` takes `--from local|s3 --to s3|blob` (default local → `$STORAGE`);
- `seed-media.mjs` already uploads through the configured adapter, so it only needs the `blob` kind;
- `s3-bucket.mjs` is skipped when `STORAGE=blob`, because stores are created in Vercel.

### D6. Tests
- **Unit tests:** `vercelBlob.test.mjs` with `@vercel/blob` mocked covers every method's mapping, 404s, pagination, the token never in config, and that no upload is ever made with public access.
- **Live check:** a `blob` CI step, only when `BLOB_TEST_TOKEN` is set, round-trips upload/exists/download/list/delete against the test store, and seeds public media into it under a per-run prefix that it then deletes.
- **E2E:** the full e2e run on Neon + Blob happens on Vercel previews (`add-vercel-deploy-pipeline`).

## Risks / Trade-offs

- **[EmDash's admin may assume S3-style signed PUTs]** → D0.2 proves it first. The fallback is explicit and needs the user's sign-off.
- **[Function bandwidth cost: every media byte passes through a function]** → The CDN cache (D0.3) makes repeat views free of function time. The redirect option exists if costs show up.
- **[Vendor lock-in for media]** → Keys and URLs are unchanged, and `media:copy` and `data:export` work in both directions, so moving back to S3 is a copy.
- **[Blob might not support private files]** → D0.1 answers it before any code. There's no public fallback (D2); the change goes back to the user with the private S3 bucket as the alternative.

## Migration Plan

New environments are seeded straight into Blob (`npm run db:setup`). The production move (local CMS → Neon + Blob) is `move-production-to-vercel`, using `data:import`. Rollback: `media:copy --from blob --to s3`, then rebuild with `STORAGE=s3`.
