## 1. Preparation

- [ ] 1.1 Confirm which CMS instance is canonical (holds the current child profiles and editor changes), and who runs it. Record that, the two backup key holders and the alert recipients in the runbook's private notes (by role in the docs). Verify the owner signs off on the note.
- [ ] 1.2 Add `scripts/deploy/check-cutover.mjs` (D2: every Webflow sitemap URL resolves on a given host, apex → `www`, HTTPS, `--dns` mail-record comparison) and `scripts/deploy/compare-sites.mjs` (sitemap HTML diff without random IDs), with unit tests for URL and record comparison. Verify:
  - against the current Vercel production `*.vercel.app` URL (public seed), the URL check reports only seed-dependent differences;
  - `--dns` against the current live domain prints the recorded records.

## 2. Backups and restore

- [ ] 2.1 Create the `vvf-backups` private store (or the D4 fallback bucket), the `age` key pair (private key with the two holders), and the `production-backup` GitHub environment limited to `main`. Add `.github/workflows/backup.yml` and `scripts/backup/` (export, encrypt, upload, prune) per D4. Verify:
  - a manual run uploads `daily/<date>.tar.gz.age`;
  - the archive can't be read without the private key;
  - the run produced no GitHub artifact and no plaintext in its logs;
  - a seeded 31-day-old test object is pruned.
- [ ] 2.2 Add `scripts/backup/restore.mjs` (D5), and run the first drill from the latest archive into a scratch Neon branch and Blob prefix. Verify counts match the manifest, the site renders from it, and the scratch branch and prefix are deleted. Log the result in the runbook.
- [ ] 2.3 Confirm the production Neon plan's point-in-time history is at least 7 days, and rehearse a restore to a timestamp into a branch (D4). Verify the branch has the data as of that time. Then delete it.
- [ ] 2.4 Write the backup, restore and drill runbook in `deploying-to-vercel.md`, and verify the docs site builds.

## 3. Rehearsal

- [ ] 3.1 Rehearse D1 steps 3–5 against a scratch Neon branch of `vvf-production`, a scratch Blob prefix and a staged deployment: export the canonical CMS, import it, then run `compare-sites.mjs` (no differences) and `check-cutover.mjs` against the staged URL. Also run `npm run test:parity` against Webflow for the visual report. Record the timings, to size the freeze window, then delete the scratch data and the export archive.

## 4. Monitoring

- [ ] 4.1 Set up the uptime monitor per D6 on the `*.vercel.app` production URL first. Verify that an alert arrives within 10 minutes when `/readyz` is forced to 503 (temporarily wrong `DATABASE_URL` on a staged deployment pointed to by the monitor). Then point it at the real domain at cutover.

## 5. Cutover

- [ ] 5.1 T−3 and T−1 (D1 steps 1–2): record the DNS records, lower the TTLs, add the domains in Vercel with certificates pre-issued, and announce the freeze, adding the notice to `marketing-guide.md`. Verify `check-cutover.mjs --dns` shows the records unchanged except the TTLs, and Vercel shows both domains' certificates as issued.
- [ ] 5.2 Freeze and move data (D1 step 3): final Webflow re-migration, export, reset production to empty and migrated, import. Verify the import's count check passes, and `compare-sites.mjs` against the staged deployment shows no differences.
- [ ] 5.3 Switch DNS and check (D1 steps 4–5). Verify:
  - `check-cutover.mjs --dns` passes on the domain (URLs, apex redirect, HTTPS, mail records unchanged);
  - one test submission per form arrives with SPF and DKIM passing;
  - GTM fires;
  - the donation widgets load;
  - an editor and a safeguarding user can sign in.
- [ ] 5.4 End the freeze and delete the export archive everywhere it was copied (proposal: safeguarding). Verify with the person who ran the export.

## 6. After launch

- [ ] 6.1 Watch for 14 days (D3): keep Webflow published, and check the daily backups and the monitor. On day 14, raise the DNS TTLs back to normal and record that the Webflow rollback window has closed. Verify `check-cutover.mjs --dns` shows the new TTLs, and add the next quarterly drill date to the runbook.

## Workflow follow-up

- Archive the change after launch, and close the Basecamp card linked in proposal.md.
- Retiring the Webflow account is a separate decision for the foundation after the rollback window.
