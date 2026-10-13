# Webflow → Astro/EmDash migration

Pulls content, media, and page copy from the live Webflow site into this
project. Change spec: `openspec/changes/migrate-webflow-site/`.

## Source

- Site: https://www.victoriavenezuelafoundation.org (Webflow site `vvfstaging`).
- Locale: English (primary) only. `/es` URLs and secondary-locale CMS variants
  are never fetched.
- Preferred source is the Webflow Data API (`WEBFLOW_API_TOKEN`,
  `WEBFLOW_SITE_ID` in `.env`). When the token is absent or rejected, the
  extractor falls back to crawling the English URLs in the live sitemap.

## Children's data (public repo)

`anclist/vvf-astro` is a public repository, and sponsored children are minors.
Nothing identifying a child is committed:

- `scripts/migrate/snapshot/children.json` — gitignored
- `seed/media/children/` — gitignored
- `seed/seed.local.json` — gitignored; the full seed including children

The committed `seed/seed.json` holds everything else. `npm run seed` applies
`seed/seed.local.json` when it exists, otherwise `seed/seed.json`. Run
`npm run migrate` locally to regenerate the child data.

Only fields already public on the live site are imported; `private_full_name`
is always left empty.

## API access status

Token scope needed: **CMS: Read-only** (Assets/Components read are accepted
but unused; `sites:read` is not required).

2026-10-03: with a site token, the API dump (16 collections, written to the
gitignored `snapshot/api/`) matched the scraped snapshot exactly —
`npm run migrate:validate` reports 0 differences. The scrape remains the
source of the normalized snapshot; the API is the cross-check.

## Re-running the migration

Run this whenever the live site changes, and once more right before
cutover:

```bash
# 1. (Optional) Webflow API access — CMS read-only. Without it the
#    extractor scrapes the English pages in the live sitemap.
#    .env: WEBFLOW_API_TOKEN=…  WEBFLOW_SITE_ID=…

# 2. Pull content and media.
npm run migrate:extract      # live site → scripts/migrate/snapshot/ (+ snapshot/api/ with a token)
npm run migrate:validate     # with a token: scrape vs Webflow API — expect "0 differences"
npm run migrate:harvest      # images/PDFs → seed/media/, public/images/

# 3. Rebuild the local database (starts a dev server, uploads media into
#    EmDash, regenerates seed/seed.json + seed/seed.local.json, applies them).
npm run seed

#    Reseeding replaces the database, so any EmDash API token (e.g.
#    EMDASH_SYNC_PAT for the static-page sync) must be regenerated in the
#    admin UI afterwards.

# 4. Check the result.
npm run test:unit
npm run build && npm run preview   # then, in another terminal:
npx playwright test                # e2e, incl. redirects + sitemap coverage
npm run test:parity                # live vs local screenshots → test-results/parity/
```

Review `scripts/migrate/report.md` after each run: it lists what was
extracted, downloaded, uploaded and transformed, decisions taken, content
that was dropped, and the accepted differences from the last parity review.
Commit the snapshot, `seed/seed.json`, `seed/media/` (minus children),
`public/images/` and `src/data/page-seo.json`; review the snapshot diff to
see what changed on the live site.

`npm run migrate` runs extract, harvest, media and transform in one go, but
the media step needs a dev server already running (`EMDASH_URL`, default
`http://localhost:4321`). `npm run seed` handles that for you.

### Where things live

| What | Where |
| --- | --- |
| Live → project URL map (redirects, SEO lookup, sitemap test) | `src/lib/legacyRoutes.mjs` |
| Live page titles/descriptions/share images | `src/data/page-seo.json` (generated) |
| Design tokens | `tailwind.config.cjs`, `src/index.css`; docs: `node scripts/docs-tokens.mjs` |
| Field mapping per collection | `scripts/migrate/mappers.mjs` |
| HTML parsers (scrape fallback) | `scripts/migrate/lib/parse.mjs` |
