## Context

See proposal.md for motivation. Current state that shapes the approach:

- EmDash 0.38 already ships an MCP server at `/_emdash/api/mcp` (stateless Streamable HTTP) with ~60 tools (`content_*`, `media_*`, `menu_*`, `revision_*`, `schema_*`, `settings_*`, `taxonomy_*`). Every tool checks a token scope (`content:read|write`, `media:*`, `schema:*`, ...) and a role. OAuth authorization is built in (`/_emdash/api/oauth/authorize`).
- EmDash roles (`@emdash-cms/auth` rbac): CONTRIBUTOR can create drafts; AUTHOR can edit/publish only their own items; EDITOR can edit/publish/trash any item and manage menus, taxonomies and bylines; ADMIN owns schema, settings, users, redirects and permanent deletes. There is no per-collection permission.
- Seed-imported items have no author, so only EDITOR or above can edit them.
- EmDash i18n is row-per-locale: each row has a `locale`, translations share a `translation_group`, slugs are unique per locale. It reads Astro's `i18n` config. MCP `content_create` accepts `locale` and `translationOf`; `content_translations` and `menu_translations` exist.
- The site is SSR (`output: 'server'`, node standalone). Published CMS edits are live without a rebuild; anything imported at build time (`src/data/page-seo.json`, hardcoded `.astro` copy) is not.
- `Layout.astro` currently lets `page-seo.json` override page props (`live.title ?? props.title`), so titles hardcoded in pages are dead code for static routes.
- All content reads go through `src/lib/content/index.ts` (one-adapter rule). It has no locale today.
- The live Webflow site serves en-US unprefixed and es-VE under `/es/...`; the existing migration skipped Spanish.
- Production host, database and media storage are undecided.

## Goals / Non-Goals

**Goals:**
- One pass over every page that both externalizes copy and makes it locale-aware.
- Marketing can change any copy, SEO field or CMS item, in either locale, through an MCP client, and cannot change structure, styling, behavior, schema or child profiles.
- Every edit is recoverable (revisions, trash).

**Non-Goals:**
- A custom MCP server or a git-backed editing flow.
- Marketing-editable layout, sections, components, classes or link targets on static pages.
- Automatic machine translation that publishes without a human.
- More than two locales (the design must not preclude a third, but nothing is built for it).

## Decisions

### D1. Use EmDash's built-in MCP endpoint, not a custom server
The endpoint already enforces scopes and roles, supports drafts, publishing, scheduling, revisions and translations, and runs inside the same process as the site. A custom server would duplicate all of that.
*Alternative:* git-backed MCP that edits `.astro`/JSON and opens PRs. Rejected: string edits on source files are fragile, every change waits for review and deploy, and it needs separate git credentials and a preview pipeline.

### D2. Static copy lives in a `page_copy` collection, one row per slot per locale
Each row: `route_path` (or `_global` for site-wide microcopy), `key` (e.g. `hero.heading`), `label` (human description, e.g. "Home: hero heading"), `format` (`plain`, `rich` or `image`), `max_length`, and the value (`value`, `rich_value` or `image_value` by format). Developer-owned fields are non-translatable (EmDash keeps them identical across locales); only the value fields are translated. Translations of a slot share a translation group.
Collection detail templates declare their fixed text the same way, under a template route (`/events/*`, `/resources/*`, `/blog/*`), shared by every item. Text that belongs to one item (e.g. the 2026 tournament's earthquake-relief appeal) is not template copy: it becomes fields on the collection.
Slots are declared in code next to the page that uses them (a per-page slot manifest: key, label, format, max length, English default). Pages read their slots through the adapter and never render a slot that isn't declared.
Marketing edits only `value`; developers own the other fields through the manifest.
*Alternatives:* (a) a JSON `copy` field on `pages` — rejected: no per-slot validation, poor admin UI, easy to add junk keys; (b) one typed collection per page — rejected: schema churn whenever copy is added.

### D3. Per-page SEO lives in `page_copy`, as reserved slots
Every page's manifest declares `seo.title`, `seo.description` and `seo.image` slots (plain, plain, image). `Layout.astro` resolves SEO as: explicit page props for CMS detail routes → the page's SEO slots (current locale → English → default from code). `page-seo.json` is used once, by the migration, to seed English SEO and is no longer imported at runtime. This also fixes the inverted precedence bug.
`pages` stays a sync-owned inventory (route, source file, last synced, stale) with no revisions and no editor-facing fields.
*Alternative:* SEO fields on `pages`. Rejected: with revisions enabled (D8), the sync's per-boot `last_synced_at` write would become a draft that has to be published, and publishing it could publish an editor's unfinished SEO draft.

### D4. Locale routing via Astro `i18n`
`defaultLocale: 'en'`, locales `en` and `{ path: 'es', codes: ['es-VE', 'es'] }`, `prefixDefaultLocale: false`. Pages are written once and served for both locales (shared page modules under a locale-aware route structure) rather than duplicated `.astro` files per locale. The current locale is derived from the URL and passed to every adapter call. Concretely, middleware rewrites `/es/...` to the shared page module (`next(path)`), and pages read their locale from `Astro.originPathname`, so no per-locale page files exist. Astro's built-in `fallback`/`fallbackType: 'rewrite'` was tried first and rejected: in production builds its rewritten responses come back with status 302. Internal links stay written as English paths in code; middleware rewrites `href`/`action` paths on Spanish HTML responses to `/es/...` (skipping assets, EmDash routes and links that carry `hreflang`), which also covers links inside CMS rich text.
`<html lang>` is `en-US` or `es-VE`; `hreflang` alternates (`en-US`, `es-VE`, `x-default` → English) are emitted only for locales that actually have content for that page.

### D5. Fallback chain: es → en → 404
- CMS detail route (`/es/events/<slug>`): Spanish row by Spanish slug → English row by the same slug or translation group → 404.
- Static page: the route always exists in code; each slot falls back es → en → manifest default (the last case is reported, not shown as an error).
- A page served with English fallback content is marked `lang="en"` on the fallback content and its canonical points at the English URL, so search engines don't index duplicate English content under `/es`.

### D6. Adapter gains a locale parameter everywhere
Every getter in `src/lib/content/index.ts` takes a locale (default `en`) and implements D5 internally, so pages never implement fallback logic themselves. A new getter returns all slots for a route (plus `_global`) in one query.

### D7. Marketing role = EDITOR, constrained by a write guard
Marketing needs EDITOR because migrated items have no author (AUTHOR could edit nothing). OAuth tokens for marketing are limited to `content:read`, `content:write`, `media:read`, `media:write`; never `schema:*`, `settings:*` or admin.
A server-side guard (Astro middleware in front of both `/_emdash/api/mcp` and the EmDash content REST API used by the admin UI) adds rules EmDash can't express:
1. **Children:** writes, publishes, deletes and translations on the `children` collection are rejected unless the user is on the safeguarding allowlist (configured server-side, not in the repo). Reads are restricted too: non-allowlisted users never receive `private_full_name`, and only see published child profiles (already public on the site), so non-public child data can't flow into an AI conversation.
2. **`page_copy`:** only `value` may change; rows can't be created or deleted by marketing (the sync owns that); `value` must satisfy the row's `format` and `max_length`. SEO slots use max lengths of 60 (title) and 160 (description). Limits are checked on edits only: the sync never rewrites values, so live values migrated over the limit (home and financials-category titles, corporate-sponsorships description) stay until someone edits them.
3. **`pages`:** read-only for marketing (sync-owned inventory).
4. **Menus:** menu item URLs must resolve to an existing route (same check as `verify-menu-links`), in either locale.
5. **Rich text:** only the marks and block types the components render are accepted.
6. **Translations:** creating a translation (`translationOf`) with any status other than draft is refused, with a message asking for `status: "draft"`. (Rewriting the request to draft was tried and dropped: Astro hands the endpoint the original request body even when middleware forwards a modified one.)
7. **Deny by default:** any tool or collection the guard does not know is refused for marketing users.
Rejections return a clear MCP error message so the client can explain it to the user.
*Alternative:* CONTRIBUTOR + an editor who publishes. Rejected for now: it reintroduces the bottleneck the change exists to remove. Can be revisited by changing the role only.

### D8. Publish model
Every marketing-editable collection (all content collections plus `page_copy`) declares `supports: ["drafts", "revisions"]`; `pages` does not. Marketing edits are drafts until published; marketing may publish directly. Undo is revision restore (`revision_restore`); deletes go to trash (permanent delete is ADMIN-only). Spanish translations created by an AI client are always created as drafts.

### D9. Static-page sync owns the shape of copy
The existing first-request sync is extended: `pages` rows cover the scanned static routes plus every route that declares a copy manifest (listing pages such as `/events` and the resource category pages have copy and SEO too). For each route and locale it upserts the `pages` row, creates missing `page_copy` rows from the manifest (published, so they're live) (English default as English value; Spanish rows left empty so they fall back), updates `label`/`format`/`max_length` from the manifest only when they changed (and skips a row that has an unpublished editor draft, reporting it, so the sync never publishes someone's draft), never overwrites values, and marks rows whose key left the manifest as stale.

### D10. Spanish migration
Extend `scripts/migrate` to fetch the secondary locale: CMS item variants via the Webflow Data API (per-locale item reads), and `/es` pages by crawl. Spanish CMS items become `es` rows in the same translation group as their English rows. Spanish page copy is mapped onto the same slot keys as English. Live `/es` URLs (including any Spanish slugs and `/es` versions of legacy Webflow paths) are covered by redirects or matching routes. The existing child-privacy rules apply unchanged to Spanish variants (snapshot gitignored, no private name).

## Risks / Trade-offs

- [Refactoring every page at once may cause visual regressions] → existing parity screenshots and e2e run against both locales; copy migration is mechanical (manifest default = current hardcoded text) and can be done page by page.
- [EDITOR is broader than marketing needs] → the D7 guard plus scope-limited tokens; guard rules have unit tests; trash and revisions make mistakes recoverable.
- [The guard sits outside EmDash and could drift when EmDash adds tools or routes] → guard is deny-by-default for marketing on unknown tools/collections; an EmDash upgrade checklist item reviews new tools.
- [AI-drafted Spanish may be wrong or off-tone for a children's charity] → Spanish drafts never auto-publish; `content_compare` before publish.
- [Public MCP/OAuth endpoint is a new attack surface] → OAuth only, short-lived tokens, rate limiting (EmDash has a rate limiter), no PATs for marketing users; the endpoint ships only once the production host is decided.
- [SQLite on a single node limits hosting options] → unchanged by this change; flagged for the hosting decision.
- [Fallback English pages under `/es` could hurt SEO] → canonical to English and no `es-VE` hreflang for untranslated pages (D5).

## Migration Plan

1. Add Astro i18n config and locale-aware adapter with `en` defaults — no visible change.
2. Add `page_copy`, SEO fields on `pages`, slot manifests, sync extension; seed English from current hardcoded copy and `page-seo.json`. Switch pages to read slots. Parity check must show no diff.
3. Run the Spanish migration; seed `es` rows; enable `/es` routes and redirects. Sitemap coverage check includes `/es`.
4. Enable the write guard, configure marketing role and OAuth client, onboard marketing on a staging deploy first.
Rollback: steps 1–3 are code + seed, revertible by git and reseed. Step 4 is disabled by revoking marketing tokens/roles.

## Open Questions

- Who is on the safeguarding allowlist, and is it the same person for Spanish child profiles?
- Which MCP client marketing will use (Claude desktop/web custom connector or another), only affects onboarding docs.
- Whether Webflow localized the Spanish slugs — the migration handles either case; only affects how many redirects get generated.
