## Context

See proposal.md for motivation. Current state observed on 2026-10-02:

- **Live site**: Webflow site `vvfstaging` (CSS bundle `vvfstaging.webflow.shared.*.css`, assets on `cdn.prod.website-files.com`). Uses a Client-First–style class system (`section-title_component`, `hero_card`, `appeal_card-sun`, …) and CSS variables (`--base-color-branding--*`, `--_typography---text-sizes--*`, `--radius--*`, `--spacing--*`, `--container--*`). Nunito is the heading and body font; Open Sans and Poppins are also loaded but are a minority. The staging build shows a "Missing SEO fields" bar on resource pages.
- **Live sitemap (EN)**: 12 static pages, 17 team members (one is a "join-our-board" placeholder), ~45 children, 2 events, 12 resources across categories `stories` and `financials-transparency`.
- **Project**: Astro 7 SSR (`@astrojs/node`), EmDash 0.38 CMS on SQLite, schema and content in `seed/seed.json` (10 collections, primary menu), all reads go through `src/lib/content/index.ts`. Tailwind 3 tokens in `tailwind.config.cjs` + CSS vars in `src/index.css`. ~30 components with Storybook stories. `public/` holds only `favicon.svg`; `uploads/` is empty.
- **Webflow API**: the connected Webflow MCP returns `401 not_authorized` for this account, so API access is not yet established.
- **Working tree**: uncommitted token/component edits on `main` (Poppins/Open Sans, `brand.cyan`, `pastel.sun/salmon/sky`). These are the baseline for this change.

## Goals / Non-Goals

**Goals:**
- One repeatable pipeline (extract → snapshot → harvest → transform → seed) that can be re-run until cutover, so late content edits on Webflow can be re-pulled.
- Tokens are the only place live values land; components consume tokens.
- Keep the project's component APIs where possible; restyle internals rather than fork new components.

**Non-Goals:**
- Pixel-perfect identity. Target is "visually indistinguishable at a glance"; parity screenshots surface the remainder.
- Porting Webflow interactions (IX2 animations) beyond simple hover/open states.
- Spanish locale, DNS/hosting cutover, and removing project-only features (blog, Donorbox widgets).
- Two-way sync with Webflow.

## Decisions

### D1. Extraction source: Webflow Data API v2, HTML scrape fallback
Use the Data API (`/v2/sites/:id/collections`, `/v2/collections/:id/items/live`) via a site API token in `.env` (`WEBFLOW_API_TOKEN`, `WEBFLOW_SITE_ID`). It gives exact field slugs, rich text HTML, asset URLs, and alt text. If the token is missing/unauthorized, a scraper crawls the EN sitemap and parses pages by their stable Webflow class names (e.g. `bio_item-label`/`bio_item-detail`, `crumbs_item`).
- *Alternative*: scrape only. Rejected as primary: loses unpublished-but-relevant fields (SEO, ordering) and alt text, and class-based parsing is brittle.
- *Outcome (2026-10-03)*: with a CMS read-only token, the API dump matched the scrape exactly (counts, slugs, field values), and every page-level section the project renders (offers, benefit rows, static copy) is already captured by the scrape. The scrape therefore stays the source of the normalized snapshot; the API dump is used as a validation source (`npm run migrate:validate`) and kept gitignored because it includes unpublished child fields.
- *Alternative*: Webflow MCP at apply time. Usable for discovery once authorized, but a committed script is reproducible without an agent session.

### D2. Snapshot as the contract between extract and transform
Extraction writes raw JSON to `scripts/migrate/snapshot/<collection>.json` (committed). Transform reads only the snapshot. This decouples network access from mapping logic, makes mappers unit-testable with fixtures, and lets reviewers diff content changes between pulls.

### D3. Mapping is explicit, per collection
`scripts/migrate/mappers/<collection>.ts` maps Webflow field slugs → EmDash field slugs. Unmapped source fields and missing required targets go to `scripts/migrate/report.md`. The `join-our-board` team item is mapped as a CTA, not a person (decision recorded in the report; it is excluded from the team grid if it has no person data).

### D4. Media: download once, commit (except children), import through EmDash's media API
Harvest downloads every referenced asset into `seed/media/<collection>/` keyed by source URL (manifest `seed/media/manifest.json` maps source URL → local path + alt + content hash, which makes re-runs idempotent; child media and its manifest live in the gitignored `seed/media/children/`). Site-chrome assets (logo, social image, favicons) and page imagery not tied to a CMS item go to `public/` and are referenced directly.

CMS media enters EmDash's media store through its media API, not through seed `$media` references:
1. A local seeding command resets the database, applies the schema, and starts a dev server.
2. An importer uploads each manifest file with `EmDashClient.mediaUpload` (dev-bypass auth on localhost; no token), sets its alt text via `PUT /_emdash/api/media/:id`, and records source URL → EmDash media value (`{ provider: "local", id, meta: { storageKey }, … }`) in a gitignored, database-specific map.
3. Transform writes those media values directly into image fields of the generated seed content, which is then applied.

Local media values carry no `src`; the content adapter resolves them to `/_emdash/api/media/file/<storageKey>`.
- *Rejected*: `$media` seed references. EmDash 0.38 supports only `$media.url`, downloads at seed time, and its SSRF guard blocks localhost/private IPs, so neither local files nor a local static server work. Pointing it at the Webflow CDN would tie seeding to Webflow.
- *Rejected*: serving media as static files (`public/media/`) with external media values: simple, but migrated images would sit outside EmDash's media library.
- Images are not re-encoded; Astro's image pipeline is not introduced in this change.

### D5. Tokens: Tailwind theme mirrors live CSS variables 1:1
Rewrite `tailwind.config.cjs` theme sections from the live variables and generate matching CSS custom properties in `src/index.css`. Naming follows the live semantics (`brand-primary`, `brand-accent`, `neutral-light-gray`, `sun`/`salmon`/`sky`, `success`/`warning`/`error` pairs), with temporary aliases for existing class names (`brand-navy`, `brand-cyan`, `brand-sky`, `pastel-*`) so the restyle can proceed component by component; aliases are removed in the final cleanup task. A token mapping table lives in `docs-site` (or a comment block in the config) per the "traces to live variable" requirement.
- Fonts: load only Nunito (weights used by migrated components, e.g. 400/600/700/800) from Google Fonts. Poppins/Open Sans are dropped unless parity review finds a component that uses them.

### D6. Component restyle by live counterpart, verified in Storybook + parity screenshots
For each mapped pair (component-library spec), read the live element's computed styles at 1440 and 390px (via Playwright `getComputedStyle` against the live page) and translate to token classes. New components (Breadcrumbs, AppealCards, ArticleCard, BioCard, ProgramsCta, NavDropdown) follow existing component conventions and get stories. The header dropdown is a small vanilla script (no new framework dependency), matching existing `src/lib/carousel.ts` style.

### D7. Routes stay; redirects carry legacy URLs
Keep the project's route structure and add Astro `redirects` in `astro.config.mjs` (supports `[slug]` params and 301 on SSR). New routes: `src/pages/resources/index.astro`, `resources/category/[category].astro`, `resources/[slug].astro`.
- *Alternative*: rename project routes to match Webflow exactly (`/team-members/...`). Rejected: breaks existing e2e tests and project conventions; redirects preserve SEO equity equally well.

### D8. Content adapter extended, not bypassed
Add `getResources`, `getResourcesByCategory`, `getResource` and the child `about` mapping to `src/lib/content/{types,index}.ts` with unit tests, keeping the "pages never call EmDash directly" rule.

### D9. Parity check as an opt-in Playwright project
`e2e/parity/` runs against `LIVE_BASE_URL` and the local preview, saves screenshots and diff images to `test-results/parity/`. It is reporting-only (never fails CI on pixel diff) because live content and fonts can drift.

## Risks / Trade-offs

- [Webflow API token unavailable] → Scrape fallback covers all EN collections; report flags fields that scraping cannot recover (alt text, SEO).
- [Live site is a staging build (`vvfstaging`) and may differ from what the public sees] → Confirm with the owner that `victoriavenezuelafoundation.org` serves the intended content before the final pull; snapshot diffs make late changes visible.
- [Children's photos and names are minors' data; repo `anclist/vvf-astro` is public] → Import only what is already public; never fill `private_full_name`; keep `published` flag honored. Child snapshot (`snapshot/children.json`), child media (`seed/media/children/`), and generated child seed entries are gitignored and regenerated locally by `npm run migrate`; nothing identifying a child is committed.
- [Seeding with media needs a running dev server] → One `npm run seed` command starts and stops it; CI/e2e use the same command.
- [Repo size from committed media (~45 child photos, team photos, PDFs)] → Accept for now (tens of MB); revisit Git LFS if it exceeds ~100 MB.
- [Token rename breaks unmigrated components mid-way] → Temporary aliases (D5), removed only after all components are migrated and a hex-literal search is clean.
- [Rich text HTML from Webflow contains Webflow-specific classes/embeds] → Sanitize in transform: strip `w-*` classes, convert embeds to plain links, report anything dropped.
- [Overlap with unarchived changes' specs] → New requirement names; this change supersedes on conflict (noted in proposal).

## Migration Plan

1. Obtain a Webflow site API token (CMS: Read-only) → `.env`.
2. Run extract → harvest → transform; review `report.md` and the snapshot diff.
3. Reset the local DB and seed; run unit + e2e tests and the parity check.
4. Iterate tokens/components until parity review is accepted.
5. Re-run the pipeline right before cutover to pick up late Webflow edits.
Rollback: the pipeline only writes `scripts/migrate/snapshot/`, `seed/`, and `public/images/`; reverting those commits restores the previous seed. Code changes are ordinary commits.

## Open Questions

- Exact responsive breakpoints the live site uses (Webflow defaults are 991/767/479px) — read from the CSS during token work; does not change the approach.
- Whether the 2025 and 2026 golf tournament events store sponsor packages and auction items as CMS references or as page-level static content on Webflow — extraction will reveal it; either way they map to the existing event JSON fields.
