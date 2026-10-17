## Why

The marketing team can't change page copy or SEO metadata without a developer: static copy is hardcoded in `src/pages/*.astro` and static-page SEO lives in the build-time `src/data/page-seo.json`. At the same time, the live Webflow site serves an en-US default with a Venezuelan Spanish (es-VE) variant under `/es/...`, which the migration deliberately skipped — so cutover would drop every Spanish page. Both problems touch the same files (every page, the content adapter, the layout), so solving them together avoids refactoring every page twice.

## What Changes

- Add site localization: en-US stays unprefixed, es-VE is served under `/es/...`, with `<html lang>`, `hreflang` alternates and per-locale canonical URLs. A missing Spanish entry falls back to English; a missing English entry returns 404.
- Move static page copy and per-page SEO into EmDash: a new `page_copy` collection holding one row per developer-declared copy slot per locale — page text, per-page SEO (title, description, share image) and site-wide microcopy such as buttons, nav, footer and form labels. The existing `pages` collection stays a sync-owned inventory. Pages render copy from the CMS through the content adapter; page structure, components and styles stay in code.
- Retire `src/data/page-seo.json` as a runtime source (its values become the English seed for the CMS SEO fields).
- Make every EmDash collection locale-aware, using EmDash's row-per-locale translation model.
- Extend the Webflow migration to import the es-VE page copy, SEO and CMS item variants, and keep every live `/es/...` URL working. **BREAKING** for the `site-migration` contract, which currently excludes Spanish.
- Enable marketing editing through EmDash's built-in MCP endpoint (`/_emdash/api/mcp`) over OAuth: a marketing role with content and media scopes only (no schema access), draft → review → publish, revision-based undo, and a server-side guard that keeps child profiles under safeguarding control.

Out of scope: letting marketing create or change collections or fields; choosing the production host (still undecided, but a prerequisite for a reachable MCP endpoint); Spanish translation of new content beyond what the live site has.

## Capabilities

### New Capabilities
- `site-localization`: locale routing (en-US default unprefixed, es-VE under `/es`), fallback chain, `lang`/`hreflang`/canonical output, localized legacy redirects and nav.
- `page-copy`: CMS-managed, per-locale copy slots and SEO metadata for static pages, plus shared UI microcopy; constraints that keep edits from affecting structure, style or behavior.
- `marketing-mcp-access`: authenticated, role- and scope-limited editing of copy, SEO and CMS items through EmDash's MCP endpoint, with drafts, publishing, revisions and the child-safeguarding guard.

### Modified Capabilities
- `cms-collections`: collection items carry a locale and translation group, and marketing-editable collections keep drafts and revisions; a new `page_copy` collection holds copy slots, including per-page SEO.
- `site-migration`: extraction includes the es-VE locale and sitemap coverage includes `/es` URLs (replaces the "Spanish locale excluded" behavior).
- `static-page-sync`: the sync creates and maintains one `pages` row per route per locale (including listing routes that declare copy), and keeps `page_copy` slots in step with code without overwriting editor-managed values.

## Impact

- Code: `astro.config.mjs` (Astro `i18n` config), `src/lib/content/index.ts` and `types.ts` (locale parameter on every getter, page-copy getter), `src/layouts/Layout.astro` and `PageLayout.astro` (SEO from CMS, lang/hreflang), every file under `src/pages/` (copy from slots, `/es` routes), components with hardcoded microcopy, `src/lib/legacyRoutes.mjs`, `src/lib/staticPageSync.ts`, `seed/seed.json`, `scripts/migrate/*`.
- Removed: `src/data/page-seo.json` as a runtime import.
- Data: SQLite rows gain locales; the seed grows Spanish entries. Child data stays out of the public repo (existing rule applies to Spanish variants too).
- Systems: EmDash MCP endpoint and OAuth become a public, production-facing surface; depends on the undecided production host. Marketing uses an MCP client (e.g. Claude) as a custom connector.
- Tests: e2e and sitemap checks for `/es` routes and fallback; unit tests for adapter locale handling and the child-safeguarding guard.
