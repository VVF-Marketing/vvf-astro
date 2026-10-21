## Why

With the site running on Vercel functions, media in Blob and a gated pipeline (`run-on-vercel-functions`, `store-media-in-vercel-blob`, `add-vercel-deploy-pipeline`), what's left is the move itself:
- the real CMS content (child profiles and photos included) goes into the production Neon database and Blob store;
- `www.victoriavenezuelafoundation.org` moves from Webflow to Vercel without broken links or lost email;
- production data gets backups that have been restored at least once.

`make-app-portable` left one open question, "Should deployed exports run on a schedule, as backups?" Choosing a host answers it, and this change settles it.

Basecamp card: _link the hosting or launch card here when the change is started._

## What Changes

- **Production data imported and verified:**
  1. a final Webflow re-migration (`npm run migrate`) picks up late edits;
  2. the canonical CMS is exported (`npm run data:export`) and imported into the production Neon database and Blob store (`npm run data:import`);
  3. row counts, media counts and page HTML are compared with the source;
  4. the archive is deleted after the move (it holds child data).
- **Cutover with a content freeze:**
  - editors pause Webflow and CMS edits for the window;
  - DNS TTLs are lowered in advance;
  - the apex and `www` are added in Vercel with certificates issued before the switch;
  - mail records (Resend's DKIM/SPF, and existing MX) are kept unchanged;
  - after the switch, every legacy URL, the Spanish site, forms, GTM and the donation widgets are checked.
- **Rollback to Webflow** stays possible during the first days: the Webflow site stays published on its Webflow domain, and the old DNS records are written down.
- **Backups:**
  - Neon point-in-time recovery on production;
  - plus a daily encrypted `data:export` archive (database and media) to a private backup store, kept 30 days;
  - plus a restore drill into a scratch Neon branch, done before launch and then every quarter.
- **Monitoring:** an uptime check on `/readyz` and the home page, which alerts the team.
- **Docs:** launch runbook, backup and restore runbook, and who to call.

## Capabilities

### New Capabilities
- `production-operations`: running the live site on Vercel. Covers moving production data in, the domain cutover from Webflow without broken URLs or email, rollback during the first days, backups with tested restores, and uptime alerts.

### Modified Capabilities
<!-- none: the import, export and redirect behaviour already specified in deployment-portability and site-migration is used as-is -->

## Impact

- **New:**
  - `.github/workflows/backup.yml` (daily export, encrypted, to the backup store);
  - `scripts/backup/` (encrypt and upload, retention pruning, restore helper);
  - `scripts/deploy/check-cutover.mjs` (checks every sitemap and legacy URL on a host, plus DNS records).
- **External:**
  - DNS for `victoriavenezuelafoundation.org`, at whichever registrar or DNS host the foundation uses;
  - Vercel domains;
  - a private Blob store `vvf-backups`;
  - an encryption key pair, with the private key held offline by two named people;
  - an uptime monitor.
- **Secrets:** the GitHub environment `production-backup` (production database URL, Blob tokens, backup public key). Readable only by the scheduled backup workflow on `main`.
- **Docs:** `deploying-to-vercel.md` (launch and backup runbooks); `migration.md` (final re-run before cutover); `marketing-guide.md` (content freeze notice for editors).
- **Safeguarding:**
  - the production import and every backup hold child data;
  - archives are encrypted before they leave the runner, stored only in the private backup store, never in the repository or CI artifacts, and decrypted only for a restore.
