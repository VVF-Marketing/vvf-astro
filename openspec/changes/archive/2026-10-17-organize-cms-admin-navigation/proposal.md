## Why

The EmDash admin sidebar lists every collection flat and alphabetically, and all site text lives in one `page_copy` list of ~1,300 rows (≈650 per locale) titled by labels like "Hero heading" that repeat on every page. Marketing can't tell where a page's text or SEO lives, which list to open, or which rows belong together. They asked for "Pages & SEO > Page > SEO / Content", "CMS collections" and "Banner" sections.

EmDash 0.38's sidebar supports one level of folders (`group`), explicit order (`sortOrder`) and hiding (`hidden`), but not nested folders or one sidebar entry per row. Live and draft are states of one entry, filtered in each list, not separate places. This change gets as close to the requested structure as the admin allows, without forking EmDash.

## What Changes

- **Pages & SEO folder: one collection per page.** Each copy manifest (every static page, each detail template, the site-wide text) gets its own copy collection, named after the page ("Home", "Ways to Give", "Event pages (shared text)", "Site-wide text", …), instead of rows in the single `page_copy` list. The folder gives the Page level. **BREAKING** (internal): `page_copy` is replaced and retired.
- **SEO / Content inside each page.** Slot titles carry their number and section ("01 · SEO · Title", "04 · Content · Hero heading"). Sorting a page's list by Title shows SEO slots first, then content slots in the order they appear on the page. EmDash has no custom default order.
- **Draft vs live.** No separate folder. The marketing guide teaches EmDash's status filter (Draft / Published / Scheduled) and the "unpublished changes" marker on each entry.
- **CMS collections folder.** Events, Blog posts, Resources, FAQs, Testimonials, Team members, Sponsors / partners, Sponsorship packages, Silent auction items, Earthquake relief updates (renamed from "Campaign updates") and Children (renamed from "Sponsored children").
- **Banner folder.** `campaign_settings` relabelled "Site banner". The banner text and the on/off switch stay two fields of one entry, so they can't drift apart; field labels say what each does.
- **Hidden:** the sync-owned `pages` inventory leaves the sidebar. It stays reachable by API, MCP and direct URL.
- **Plain-language descriptions** on every collection, and list columns showing a slot's current text.
- **Schema apply script.** Existing databases get the new collections and sidebar settings from a schema-only script. `emdash seed --on-conflict update` can't be used because it rebuilds menus and overwrites site settings. A one-time migration moves existing `page_copy` values, drafts and translations into the per-page collections.
- Copy reads, the static-page sync, the marketing guard, migration scripts, tests and docs follow the new storage.

## Capabilities

### New Capabilities
- `cms-admin-navigation`: how the admin sidebar is organized (folders, order, hidden collections, names and descriptions), how slots are titled and ordered inside a page, and how drafts are found.

### Modified Capabilities
- `cms-collections`: "Page copy collection" becomes one copy collection per copy manifest. "Drafts and revisions on editable collections" covers the copy collections instead of `page_copy`.
- `static-page-sync`: "Copy slot sync" writes each slot into its page's copy collection, with its section title and position, and only flags (never creates or deletes) copy collections.
- `marketing-mcp-access`: adds "Page copy collections protected". The slot protections apply to every copy collection, and marketing can't create, change or delete collections or their sidebar settings. "Structural fields protected" itself is unchanged.

## Impact

- **Depends on** `marketing-editing-and-localization`, which must be archived first: this change modifies requirements that change introduces. Implemented as PR 9 of the stack, on `stack/08-financials-programs`.
- **Code:**
  - `src/lib/copy.ts` (page name on manifests, collection naming)
  - `src/lib/content/index.ts` (`getPageCopy` reads the page's collection)
  - `src/lib/staticPageSync.ts`
  - `src/lib/marketingGuard.ts`
  - every `_copy.ts` / `_copy.detail.ts` and `src/copy/_copy.ts`, which gain a page name
- **Seed and migration:**
  - `seed/seed.json`: collections, groups, order, descriptions
  - `scripts/migrate/transform.mjs` and `scripts/migrate/importcopy.mjs`
  - new `scripts/cms-schema.mjs` (schema-only apply) and a `page_copy` → per-page migration script
- **Ops:** each existing environment runs the schema apply and the one-time migration once, with an admin token. `EMDASH_SYNC_PAT` keeps its current scopes (no `schema:write`). Revision history recorded in `page_copy` before the move isn't carried over. That's acceptable because the site isn't live on EmDash yet.
- **Tests:** sync, guard, content, transform and import unit tests; `e2e/drafts.spec.ts`; a new check that every manifest has a collection.
- **Docs:** `localization-and-copy.md`, `marketing-guide.md` (sidebar map, finding drafts), `marketing-access.md`, README sync setup.
