## Why

The Victoria Venezuela Foundation site currently lives on Webflow (`victoriavenezuelafoundation.org`, Webflow site `vvfstaging`). This Astro + EmDash project was built from a PDF/Figma export, so its tokens, components, static assets, and CMS seed data only approximate the live site (e.g. it uses Poppins/Open Sans where the live site uses Nunito; it seeds 4 children where the live site lists ~45). To cut over hosting, the project must match the live site as closely as its component and token boundaries allow, with real content and assets in place.

## What Changes

- Treat the live Webflow site as the design source of truth: extract its CSS custom properties (colors, fonts, type scale, radii, spacing, containers) and re-base `tailwind.config.cjs` and `src/index.css` tokens on them.
- Restyle existing components (Header, Footer, Button, Hero, cards, FAQ, logos, etc.) to match their live counterparts (`navbar_*`, `footer_*`, `button.is-primary`, `hero_card`, `event-card`, `team-card`, `feature-card`, `appeal_card`, `faq-row`, `logos`, `number-card`, `article-card`, `bio_card`, `crumbs`) using tokens only — no hard-coded hex values or one-off page CSS.
- Add components that exist on the live site but not in the project: breadcrumbs, appeal-card triad, article/resource card, bio card with detail items, programs CTA card, and the three-level dropdown navigation (Make a Difference / Get Involved / Resources).
- Add a repeatable migration pipeline (`scripts/migrate/`) that pulls CMS items from the Webflow Data API (with a public-HTML scrape fallback), downloads referenced images/PDFs, and writes EmDash seed data plus static assets.
- Populate static assets in `public/` (logo, favicons, social image, decorative/section images) and CMS media in EmDash uploads.
- Populate EmDash collections with live content: team members, children, events (with sponsor packages, auction items, sponsors), FAQs, and a new **resources** collection.
- Add a `resources` collection and pages: `/resources` (all), category pages (stories, financials-transparency), and resource detail with optional PDF download.
- Extend the `children` schema with an `about` field shown on the live child page.
- Add redirects from live Webflow URLs (`/all-events`, `/team-members/:slug`, `/children/:slug`, `/venezuela-earthquake-relief`, `/sponsor-a-child-list-page`, `/resources-categories/:cat`) to the project's routes so existing links and search results keep working.
- Add a visual parity check (Playwright screenshots of live vs local for each migrated page).

**Out of scope**: Spanish (`/es`) locale — a later change. Existing project-only features with no live counterpart (blog, donation widgets, Donorbox wiring) are kept as-is, not removed.

## Capabilities

### New Capabilities
- `site-migration`: Repeatable extraction of CMS content and assets from the live Webflow site into EmDash seed data and static assets, sitemap URL coverage, and a visual parity check.
- `design-system`: Tokens derived from the live site's CSS custom properties (Nunito typeface, live palette incl. system colors, radius/spacing/container scales).
- `component-library`: Components match live Webflow component styling; adds dropdown navigation, breadcrumbs, appeal cards, article card, bio card, and programs CTA.
- `cms-collections`: Adds the `resources` collection and the child `about` field; collections populated from live content.
- `front-end`: Page parity with live, resources pages, legacy-URL redirects, per-page SEO.

### Modified Capabilities
- None in `openspec/specs/` (it holds no capability specs yet).

Note: `design-system`, `component-library`, `cms-collections`, and `front-end` were first described by the completed-but-unarchived changes `build-vv-foundation-site` and `implement-vv-foundation-website`. This change adds new, uniquely named requirements under the same capability paths, so they merge cleanly whether those changes are archived before or after this one. On conflict (e.g. fonts, pastel token names), this change's requirements supersede them.

## Impact

- **Code**: `tailwind.config.cjs`, `src/index.css`, `src/layouts/*`, most of `src/components/*` and their stories, `src/pages/*`, `src/lib/content/{index,types}.ts`, new `src/pages/resources/*`.
- **Content**: `seed/seed.json` grows substantially (schema additions + ~45 children, 17 team members, ~12 resources); `uploads/` and `public/` gain downloaded media. Local `data.db` must be reseeded.
- **Tooling**: new `scripts/migrate/` (Node scripts), new npm scripts; needs a Webflow API token with CMS read access (`WEBFLOW_API_TOKEN`, `WEBFLOW_SITE_ID` in `.env`). Current Webflow MCP connection returns 401 for this site, so authorization is a precondition, with HTML scraping as fallback.
- **Tests**: unit tests for content mappers and transformers, Playwright e2e for new routes/redirects, visual parity screenshots.
- **Working tree**: uncommitted token/component edits on `main` are the starting baseline; they will be superseded where they conflict with live values.
