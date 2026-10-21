# Spec Delta

## Purpose

Covers running the live site on Vercel: moving production data in, switching the domain from Webflow without breaking links or email, keeping a way back, and keeping restorable backups and uptime alerts.

## ADDED Requirements

### Requirement: Production data moved and verified
Before the domain moves, the production database and media store SHALL hold the full canonical CMS content, imported from one export. Row counts per table, media counts, and the HTML of every sitemap page (English and Spanish) SHALL match the source, ignoring per-render random IDs.

#### Scenario: Import check
- **WHEN** the export of the canonical CMS has been imported into production
- **THEN** every table's row count and the media count match the export's manifest, and every sitemap page's HTML matches the source site's

#### Scenario: Archive disposed of
- **WHEN** the production import has been verified
- **THEN** the export archive used for it is deleted from every machine it was copied to, and no copy exists in the repository or CI artifacts

### Requirement: Cutover without broken links
When `www.victoriavenezuelafoundation.org` and the apex domain move to Vercel, every URL in the old Webflow sitemap (English and Spanish) SHALL keep resolving, either directly or through its permanent redirect. The apex SHALL redirect permanently to `www`. HTTPS SHALL work on both from the first request after the switch.

#### Scenario: Old URL after cutover
- **WHEN** a visitor follows an old Webflow URL after the DNS switch
- **THEN** they land on the matching page, through a 301 where the path changed, over HTTPS

#### Scenario: Apex domain
- **WHEN** a visitor requests `https://victoriavenezuelafoundation.org/contact`
- **THEN** they're redirected permanently to `https://www.victoriavenezuelafoundation.org/contact`

### Requirement: Email unaffected by the cutover
The DNS change SHALL keep every existing mail record (MX, SPF, DKIM including Resend's, DMARC) as it was. The site's form emails and the foundation's own email SHALL keep being delivered during and after the switch.

#### Scenario: Contact form after cutover
- **WHEN** a visitor submits the contact form after the DNS switch
- **THEN** the email arrives at the configured address, and passes SPF and DKIM

### Requirement: Content freeze during cutover
From the final export until the cutover checks pass, content edits SHALL be paused on both Webflow and the CMS, so no edit is lost between the export and the switch. Editors SHALL be told the window in advance.

#### Scenario: Edit attempted during the freeze
- **WHEN** the freeze window is announced and in effect
- **THEN** editors know not to edit, and any edit made in error is listed by comparing against the export before the window closes

### Requirement: Rollback to Webflow during launch
For 14 days after cutover, the team SHALL be able to point the domain back to Webflow by restoring the recorded DNS records, and that procedure SHALL be documented.

#### Scenario: Launch problem
- **WHEN** a severe problem is found on the Vercel site in the first days
- **THEN** restoring the recorded DNS records serves the Webflow site again once the DNS TTL passes

### Requirement: Restorable backups
Production SHALL have point-in-time recovery of its database covering at least the last 7 days. A daily archive of the full database and media SHALL be kept for 30 days, encrypted before it leaves the machine that made it. Only the production backup workflow SHALL be able to write archives, and only named people SHALL be able to decrypt them.

#### Scenario: Daily archive
- **WHEN** the daily backup runs
- **THEN** an encrypted archive of the database and media is in the private backup store, and archives older than 30 days are removed

#### Scenario: Archive not readable without the key
- **WHEN** someone with access to the backup store but not the private key downloads an archive
- **THEN** they can't read any of its contents

### Requirement: Restore drill
Restoring from backup SHALL be rehearsed before launch and every quarter after: a backup is restored into a scratch environment, checked against production counts, and then destroyed. The outcome SHALL be recorded.

#### Scenario: Quarterly drill
- **WHEN** the quarterly drill restores the latest archive into a scratch Neon branch and Blob prefix
- **THEN** row and media counts match that day's production, the site renders from it, and the scratch environment is deleted afterwards

### Requirement: Uptime alerts
The team SHALL be alerted within 10 minutes when the home page or `/readyz` on the production domain stops answering 200.

#### Scenario: Database outage
- **WHEN** the production database becomes unreachable
- **THEN** `/readyz` answers 503, and the team gets an alert within 10 minutes
