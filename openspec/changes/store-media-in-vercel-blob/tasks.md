## 1. Spike

- [ ] 1.1 With a test Blob store and the `run-on-vercel-functions` spike deployment, answer D0's four questions: access modes, direct-upload shape and CSP origin, streamed serving of 10–20 MB files with CDN caching, and key and list mapping. Record them in design.md. Pick the D2 layout and the D3 serving mode from the answers, and confirm with the user if the fallback layout or the D4 fallback is needed.

## 2. Adapter

- [ ] 2.1 Add `@vercel/blob` and `src/lib/storage/vercelBlob.mjs` per D1/D2 (token read at runtime, `getPublicUrl` through the media route, `backups/` handled per the chosen layout). Add the `STORAGE=blob` branch in `astro.config.mjs`, and require the token(s) in `src/lib/settings.mjs`. Verify:
  - `vercelBlob.test.mjs` (mocked SDK) covers every method, 404 mapping, pagination and `backups/` routing or refusal;
  - `grep` finds no token in `.vercel/output` after a build with the token set.
- [ ] 2.2 Implement direct uploads (`getSignedUploadUrl`, `getClientUploadOrigin`) per D4. Verify on the spike deployment:
  - a 20 MB PDF and a 6 MB image upload through the admin and confirm;
  - the admin's CSP allows the upload origin and blocks others;
  - an expired or reused token is refused.
- [ ] 2.3 Implement media serving per D3. Verify on the spike deployment:
  - the 20 MB PDF downloads with `Content-Disposition: attachment`, and images render inline;
  - the second request is a CDN hit;
  - a `backups/…` key answers 404 through the media route, and its direct Blob URL is unreadable anonymously.
- [ ] 2.4 Document the Blob mode in `deploying-to-vercel.md` (media section: stores, tokens, privacy layout, size limits) and in `running-anywhere.md` (storage modes table). Add `STORAGE=blob` and the token(s) to `.env.example`. Verify the docs site builds.

## 3. Tooling

- [ ] 3.1 Add the `blob` kind to `scripts/data.mjs` `openStorage()` and `scripts/media-copy.mjs` (`--from`/`--to`), and skip `s3-bucket.mjs` under Blob (D5). Verify:
  - `media-copy.test.mjs` and `data.test.mjs` cover the new kind (mocked);
  - against the test store, copying `uploads/` from a public-seeded local site makes every seeded image render on the spike deployment.
- [ ] 3.2 Seed public media into Blob through `npm run db:setup` (D5). Verify:
  - against an empty Neon branch + test store, the "New Neon + Blob environment" scenario holds;
  - a second run uploads nothing and creates no rows (`seed-media.test.mjs` extended with the Blob kind).
- [ ] 3.3 Round-trip `data:export` → `data:import` into Neon + Blob on a scratch copy of a public-seeded site (never the real CMS here). Verify the same counts and that sitemap pages are byte-identical (the method from `make-app-portable`'s verified round trip).

## 4. CI

- [ ] 4.1 Add the live Blob check to `.github/workflows/test.yml` (only when `BLOB_TEST_TOKEN` is set; a per-run prefix, cleaned up afterwards; public seed media only) per D6. Document the secret in `testing-and-ci.md`. Verify it passes on a PR, and that it's skipped cleanly on forks without the secret.

## Workflow follow-up

- Archive the change once reviewed, and close the Basecamp card linked in proposal.md.
