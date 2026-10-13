---
title: Webflow Migration
description: How content, media and URLs move from the live Webflow site into this project, and how to re-run it.
---

The live site at victoriavenezuelafoundation.org (Webflow) is the source of truth for design and content. A repeatable pipeline in `scripts/migrate/` copies it into this project:

1. **Extract** (`npm run migrate:extract`) crawls the English and Spanish (`/es`) pages in the live sitemap into `scripts/migrate/snapshot/` and `scripts/migrate/snapshot/es/` (when `WEBFLOW_API_TOKEN` and `WEBFLOW_SITE_ID` are set, the Webflow Data API is also dumped for cross-checking).
2. **Harvest** (`npm run migrate:harvest`) downloads every referenced image and PDF: CMS media to `seed/media/`, page imagery and site chrome to `public/`.
3. **Seed** (`npm run seed`) rebuilds the local database, uploads the CMS media into EmDash's media library, and applies the generated seed.

Spanish CMS items become linked translations of the English ones, and Spanish page copy is translated slot by slot from the live `/es` pages — see [Localization & Page Copy](/localization-and-copy/#spanish-content-from-the-live-site).

## Children's data

The repository is public and sponsored children are minors. Child records, photos and the full local seed (`seed/seed.local.json`) are gitignored and regenerated locally by the pipeline; the committed seed has no children. CI runs without them, and the e2e tests that need a child skip themselves.

## Old URLs

Old Webflow paths redirect permanently (301) to this project's routes. The map lives in `src/lib/legacyRoutes.mjs` and is shared by `astro.config.mjs`, the SEO lookup and `e2e/migration.spec.ts`, which checks that every English and Spanish sitemap URL resolves. Old `/es/...` paths redirect to the Spanish project route (e.g. `/es/all-events` → `/es/events`).

| Live path | Project route |
| --- | --- |
| `/all-events` | `/events` |
| `/team-members/<slug>` | `/our-team/<slug>` |
| `/children/<slug>` | `/sponsor-a-child/children/<slug>` |
| `/sponsor-a-child-list-page` | `/sponsor-a-child/children` |
| `/venezuela-earthquake-relief` | `/earthquake-relief` |
| `/resources-categories/all` | `/resources` |
| `/resources-categories/<category>` | `/resources/category/<category>` |
| `/team-members/join-our-board` | `/contact` |

## Checking visual parity

`npm run test:parity` screenshots each migrated page, in English and Spanish, on the live site and locally at 1440px and 390px, and writes the pair plus a difference image to `test-results/parity/`. It never fails on differences; accepted differences are recorded in `scripts/migrate/report.md`.

## Re-running

See `scripts/migrate/README.md` for the full procedure. Run it again right before cutover to pick up late edits on Webflow.
