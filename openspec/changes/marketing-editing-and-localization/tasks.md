## 1. Locale foundation

- [x] 1.1 Add Astro `i18n` config (`en` default unprefixed, `es` path with `es-VE` code) in `astro.config.mjs`; verify `npm run build` succeeds and EmDash picks up both locales (admin shows a locale selector)
- [x] 1.2 Add a locale parameter (default `en`) to every getter in `src/lib/content/index.ts` with the es → en → not-found fallback inside the adapter; verify with new unit tests in `src/lib/content/index.test.ts` covering Spanish hit, English fallback and not-found
- [x] 1.3 Restructure `src/pages` so each page module is served for both `/` and `/es` routes and passes the URL locale to the adapter; verify `/es/<route>` returns 200 for every static route and every English e2e test still passes
- [x] 1.4 Return 404 from CMS detail routes when the item is missing in both locales; verify with an e2e test on `/es/events/does-not-exist`
- [x] 1.5 Update `Layout.astro` to output `<html lang>` (`en-US`/`es-VE`), per-locale canonical and `hreflang` alternates only for locales with content (canonical → English for fallback pages); verify with e2e assertions on a translated page and a fallback page
- [x] 1.6 Add the header language switch linking to the same page in the other locale (Spanish slug when one exists); verify with an e2e test on a team member detail page
- [x] 1.7 Add Spanish menus (via EmDash menu translations) and render the menu for the current locale; extend `scripts/verify-menu-links.mjs` to check `/es` links; verify `npm run verify-menu` passes

## 2. Copy slots and page SEO model

- [x] 2.1 Add the `page_copy` collection (plain/rich/image slots, drafts + revisions; per-page SEO is stored as slots) to `seed/seed.json`; verify `npm run seed` applies cleanly on an empty database
- [x] 2.2 Define the slot manifest format (key, label, format, max length, English default) and a `getPageCopy(route, locale)` adapter getter returning route + `_global` slots with es → en → default fallback; verify with unit tests including undeclared keys being ignored
- [x] 2.3 Extend `src/lib/staticPageSync.ts` to upsert per-locale `pages` rows (static routes plus routes declaring copy) and sync `page_copy` from manifests (create missing as published, update label/format/max length only when changed, never overwrite values or publish an editor draft, mark removed slots stale); verify with `staticPageSync.test.ts` cases for each scenario in the static-page-sync delta spec
- [x] 2.4 Switch `Layout.astro` SEO resolution to: page props → the page's `seo.*` copy slots (locale → English → default); stop importing `src/data/page-seo.json` at runtime and seed English SEO slots from it instead; verify an e2e check that every static English page's title/description/og:image are unchanged from before

## 3. Externalize page copy

- [x] 3.1 Declare `_global` slots for shared microcopy (header, footer, buttons, newsletter, contact form labels and messages) and switch the components to read them; verify Storybook/unit tests and parity screenshots show no visual diff
- [x] 3.2 Declare slots for Home and switch `src/pages/index.astro` to read them (English defaults = current text); verify parity check shows no diff
- [x] 3.3 Do the same for Ways to Give, Sponsor a Child, children listing, Corporate Sponsorships; verify parity check shows no diff
- [x] 3.4 Do the same for Events, Our Team, Contact, Earthquake Relief, Privacy Policy, Resources listing pages; verify parity check shows no diff
- [x] 3.5 Render plain slots as escaped text and rich slots through the existing portable text renderer limited to supported marks; verify unit tests that HTML in a plain slot is escaped and unsupported rich marks are dropped
- [x] 3.6 Add a check that fails when a static page contains literal visible copy outside slots (lint or test over `src/pages`); verify it passes on the converted pages and fails on a planted literal

- [x] 3.7 Move the fixed interface text of the collection detail templates (event, resource, blog post) into template copy manifests (`/events/*`, `/resources/*`, `/blog/*`), localize their dates, and extend the copy lint to cover detail templates; verify the text snapshot is unchanged and the lint passes over every page file
- [x] 3.8 Add event appeal fields (heading, text, image, caption, cards label, cards, call to action) and event contact fields (phone, email, address) to `events`, seed the 2026 tournament's current values through the migration mapper, and render the event page's appeal and contact sections from them (hidden when empty); verify the text snapshot is unchanged and a unit test maps the new fields

## 4. Spanish migration

- [x] 4.1 Extend `scripts/migrate` extraction to read Spanish CMS item variants via the Webflow Data API (and `/es` crawl fallback), linked to their English items; verify the snapshot contains Spanish variants and child snapshots stay gitignored (`git status` clean of child data)
- [x] 4.2 Extract Spanish static page copy and SEO from `/es` pages and map them onto declared slot keys, reporting unmapped text; verify the migration report and that `/es` renders the live Spanish home hero
- [x] 4.3 Transform Spanish items into `es` seed entries in the same translation group as their English entries, preserving live Spanish slugs; verify `npm run seed` applies and Spanish counts match the live site per collection
- [x] 4.4 Add `/es` equivalents of the legacy redirects in `src/lib/legacyRoutes.mjs` (and Spanish-slug redirects if Webflow localized slugs); verify `legacyRoutes.test.ts` covers them
- [x] 4.5 Extend the sitemap coverage check and the parity check to include `/es` URLs; verify every live `/es` sitemap URL returns 200 or a single 301 to a 200

## 5. Marketing write guard

- [x] 5.0 Declare `supports: ["drafts", "revisions"]` on every content collection and `page_copy` (not `pages`); verify the seed still applies to an empty database, the migration seed regenerates, and an e2e/unit check that an unpublished edit doesn't change the public page
- [x] 5.1 Add guard middleware in `src/middleware.ts` in front of `/_emdash/api/mcp` and the EmDash content/menu REST routes, identifying marketing users (EDITOR, not on the safeguarding allowlist) and denying unknown tools/collections by default; verify unit tests for allow and deny paths
- [x] 5.2 Block all writes to `children` (create, update, publish, unpublish, translate, delete) for non-allowlisted users, and restrict their reads to published profiles with `private_full_name` stripped, with the allowlist read from server config (env), not the repo; verify unit tests over both MCP and REST paths for writes, list/get reads and unpublished-by-id
- [x] 5.3 Restrict `page_copy` edits to the value field matching the slot's format (validated against max length; SEO title ≤60, description ≤160), make `pages` read-only, and block create/delete of either; verify unit tests per rule
- [x] 5.4 Validate menu item URLs against existing routes per locale (reusing the verify-menu-links logic); verify a unit test rejecting a broken `/es` link
- [x] 5.5 Only allow items created with `translationOf` as drafts (refuse other statuses with a clear message); verify a unit test that a published-status translation create is refused and a draft one allowed
- [x] 5.6 Make guard rejections return MCP errors with human-readable messages naming the rule; verify by calling the endpoint locally with a marketing token and reading the error

## 6. Access setup and rollout

- [x] 6.1 Document the marketing role setup (EDITOR, OAuth scopes `content:*` and `media:*` only, no PATs) and the safeguarding allowlist configuration in `docs-site/`; verify the doc builds in the docs site
- [ ] 6.2 Write a marketing onboarding guide (connecting an MCP client to `/_emdash/api/mcp`, drafting, publishing, comparing, restoring revisions, translating); verify a non-developer follows it on a local or staging instance
- [ ] 6.3 End-to-end check on a staging deploy: marketing user edits an English copy slot, a Spanish SEO description and an event, publishes, restores a revision, drafts a Spanish translation, and is refused on a child profile and a schema change; record the result in the change
- [ ] 6.4 Run the full suite (`npm test`, `npm run test:parity`, `npm run verify-menu`) and confirm it passes before archiving
