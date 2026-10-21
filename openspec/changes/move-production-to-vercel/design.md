## Context

See proposal.md (Why). Starting point:

- **Content today:**
  - the public site is Webflow at `www.victoriavenezuelafoundation.org`;
  - the project's content was migrated from it (`scripts/migrate/`, `docs-site/.../migration.md`) into a CMS running on SQLite + disk, the "local CMS" in `make-app-portable`'s verified round trip (90 tables, 7,417 rows, 154 media files);
  - child profiles exist only there (`seed/seed.local.json`, never committed).
- **Tools that already exist:**
  - `npm run data:export` / `data:import`: a tar.gz with database, media and manifest; the import runs in one transaction, refuses repository paths and verifies counts;
  - `npm run migrate`: re-runs the Webflow migration;
  - `e2e/migration.spec.ts`: every legacy sitemap URL resolves;
  - `npm run test:parity`: visual parity, live vs build;
  - `legacyRoutes.mjs`: 301/302 map.
- **From the earlier Vercel changes:**
  - the production Vercel project, already deploying `main` on its `*.vercel.app` URL against a public-seeded `vvf-production` database;
  - `vvf-media-production`;
  - staged promotion and rollback.
- **Mail:** form emails go through Resend, whose sending domain needs two DNS records (`.env.example`). The foundation's own mailbox MX records are on the same domain.

## Goals / Non-Goals

**Goals:**
- One rehearsed cutover with a written runbook and a way back.
- Backups that have been restored, not only taken.

**Non-Goals:**
- Changing the content model or the editor workflow.
- Moving DNS hosting itself: records change, the DNS provider doesn't.
- Retiring the Webflow account. That's after the 14-day rollback window, outside this change.

## Decisions

### D1. Rehearse, then cut over
Run the whole sequence once as a rehearsal against a scratch Neon branch of `vvf-production` and a scratch Blob prefix, checked on a staged deployment URL. Then run it for real. Both runs follow the same runbook (`deploying-to-vercel.md` → "Launch"):

1. **T−3 days:** lower the TTL on the apex and `www` records to 300 s. Record every current DNS record (export or screenshot) in the runbook's private notes, outside the repository.
2. **T−1 day:**
   - add both domains in Vercel (apex redirects to `www` permanently);
   - pre-issue certificates through Vercel's DNS-challenge verification (TXT records) so HTTPS works on the first request;
   - announce the freeze to editors.
3. **Freeze starts:**
   1. final `npm run migrate` re-run for late Webflow edits, then applied to the canonical CMS as usual (`migration.md`);
   2. `npm run data:export` of the canonical CMS, written outside the repository;
   3. `db:setup --no-seed --yes` resets the production database to empty and migrated, using a fresh Neon branch promoted to primary, so the public-seed content from the pipeline change is gone;
   4. `npm run data:import` into production Neon + `vvf-media-production`.
4. **Verify (D2), then switch DNS:** point `www` (CNAME) and the apex (A/ALIAS) at Vercel. Change nothing else.
5. **After the switch:**
   - `scripts/deploy/check-cutover.mjs` runs against the domain;
   - manual checks: forms (one test submission each), GTM firing (Tag Assistant), the Donorbox and Double the Donation widgets, the admin sign-in.
6. **Freeze ends.** Delete the export archive (proposal: safeguarding).

### D2. Verification
- **Counts:** `data:import` already checks counts against the manifest.
- **Pages:** on top of that, fetch every sitemap URL (English and Spanish) from the source CMS server (run locally) and from the staged production deployment, and diff the HTML with per-render IDs stripped. That's the method of `make-app-portable`'s verified round trip, kept as `scripts/deploy/compare-sites.mjs`.
- **Visuals:** `npm run test:parity` with `LIVE_BASE_URL=<webflow>` against the staged URL gives a visual report; it's reporting only.
- **`check-cutover.mjs`:** for a host, every URL in the snapshot's Webflow sitemap (`scripts/migrate/snapshot/`) answers 200, or 301/302 to a 200; the apex redirects to `www`; HTTPS works. With `--dns` it also confirms that the MX, SPF, DKIM and DMARC records match the recorded pre-cutover values.

### D3. Rollback to Webflow
For 14 days, leave the Webflow site published on its `*.webflow.io` domain, with its custom domain settings kept. Rollback means:
1. restore the recorded apex and `www` records;
2. wait out the 300 s TTL;
3. re-export any CMS edits made since, so they can be replayed later.

After 14 days without rollback, raise the TTLs back to normal.

### D4. Backups
- **Neon point-in-time recovery:** production on a Neon plan with at least a 7-day history window. Restoring is "create a branch at a timestamp", then point `DATABASE_URL` at it and redeploy (runbook).
- **Daily archive:** `.github/workflows/backup.yml`, scheduled daily at a quiet hour (America/Caracas night) and on `main` only, using the GitHub environment `production-backup`:
  1. run `npm run data:export` against the direct production URL and `vvf-media-production`, writing to the runner's temp directory;
  2. encrypt with `age` to the backup public key (a secret); the plaintext is shredded straight away;
  3. upload to the private Blob store `vvf-backups` (its own token, so the site's media token can't read or delete backups) as `daily/<date>.tar.gz.age`;
  4. delete archives older than 30 days.

  The workflow never uploads an artifact, and a failure notifies the maintainers.
- **Why not EmDash's built-in backups:** they're stored in the media store under `backups/` and exclude media files. The site's export covers database and media, and keeping archives in a separate store limits who can touch them.
- **If private Blob storage isn't available** (`store-media-in-vercel-blob` D0): archives are already encrypted. The fallback is a private S3-compatible bucket for backups only, which changes nothing else in the design.
- **Private key:** held offline (password manager) by two named people, recorded in the runbook by role, not in the repository.

### D5. Restore drill
Decrypted, the archive is child data, so the drill never leaves it on a personal laptop or on any disk (Eduardo's review on #32):
- **Where:** a disposable machine made for the drill (a throwaway cloud VM or container in the foundation's account), destroyed afterwards. Not a personal laptop.
- **No plaintext on disk:** `scripts/backup/restore.mjs` streams the download through `age` decryption and extracts into a RAM-backed directory (`/dev/shm` on Linux), which the script refuses to run without. The key file is read from the key holder's password manager into that same directory.

The script:
1. downloads an archive and decrypts it in memory as above;
2. creates an empty scratch Neon branch (a new root branch in `vvf-production`, migrated with `db:setup --no-seed`);
3. imports into it with a scratch Blob prefix (`restore-drill/<date>/`);
4. prints counts against the manifest;
5. a local server pointed at it renders the home page and a child profile page for a signed-in safeguarding user, in a private browser window;
6. **cleans up in a `finally`, so it also runs when a step fails:** removes the RAM directory (archive, media, key file), deletes the scratch branch and Blob prefix, then checks that none of them exist any more, and prints that check. A failed cleanup exits non-zero and says what's left.

Then the VM or container is destroyed. Run before launch, using the first daily archive, and then quarterly, with the result and the cleanup check logged in the runbook.

### D6. Uptime monitoring
An external monitor checks `https://www.victoriavenezuelafoundation.org/` and `/readyz` every 5 minutes from at least two regions, and alerts the team by email after 2 failures. That's within the spec's 10 minutes. The monitor holds no secrets: both endpoints are public and reveal only status.

## Risks / Trade-offs

- **[An edit is lost during the freeze]** → The freeze is announced, and an edit made by mistake shows up in the diff of the source CMS against the export before the freeze ends. Short windows (export to switch in under 2 hours) keep it small.
- **[Certificates not ready at the switch]** → Pre-issue them by DNS verification (D1 step 2). `check-cutover.mjs` checks HTTPS on the staged domain mapping first.
- **[Mail breaks from a DNS slip]** → Only the apex and `www` web records change. `check-cutover.mjs --dns` compares the mail records before and after.
- **[A backup holds child data]** → Encrypted before upload, a separate store with a separate token, no CI artifacts, two key holders.
- **[Backups fail silently]** → A failed scheduled workflow notifies. The quarterly drill catches archives that upload but don't restore.

## Migration Plan

This change *is* the migration. Order: rehearsal (D1 against scratch), then backups and drill working (D4, D5), then monitoring (D6), then the real cutover (D1), then the 14-day watch, then raise TTLs. Rollback: D3.

## Open Questions

- Which uptime monitor, and who receives alerts? Any monitor that meets D6 works; pick at setup.
- The launch date and freeze window, to agree with the foundation's editors.
