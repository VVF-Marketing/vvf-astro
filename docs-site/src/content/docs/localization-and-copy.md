---
title: Localization & Page Copy
description: English and Spanish routing, translation fallback, and how page text lives in the CMS as copy slots.
---

The site serves **en-US** at unprefixed paths and **es-VE** under `/es`, as the live Webflow site did. All visible text — page copy, SEO, shared interface text — comes from the CMS, so editors change it without a deploy.

## Locales and routing

- `astro.config.mjs` declares the locales (`en` default, `es` under `/es`); EmDash reads them and stores one row per locale, with translations sharing a `translation_group`.
- Pages are written once. `src/middleware.ts` rewrites `/es/...` to the same page module; pages read their locale with `localeFromPath(Astro.originPathname)` (`src/lib/i18n.ts`).
- On every page the middleware makes links back into the site follow the page's language (`src/lib/localizeLinks.ts`): full addresses of the site (`src/lib/site.mjs`) become paths, and paths get `/es` on Spanish pages and lose it on English ones. Code keeps writing English paths, and CMS content works however editors wrote the link. Links carrying `hreflang` (the language switch) are left alone. The migration also stores same-site links as paths.
- Links to other websites open in a new tab, in the same pass (`src/lib/externalLinks.ts`). Any `http(s)` link whose host isn't the site's gets `target="_blank"` and `rel` with `noopener` (no `noreferrer`, so partners and Donorbox still see the referral). It also gets a screen-reader cue at the end of its accessible name: the `a11y.newTab` site-wide slot, "(opens in a new tab)" / "(se abre en una pestaña nueva)". The cue is visually hidden text, or appended to `aria-label` when the link has one. A link that sets its own `target` is left alone, so code can opt out with `target="_self"`. Paths, anchors, `mailto:`/`tel:` and the site's own address are never treated as external.
- Old Webflow `/es/...` URLs redirect once (301) to the Spanish project route, using the same table as the English redirects (`src/lib/legacyRoutes.mjs`).

## Fallback: Spanish → English → 404

Every content getter in `src/lib/content/index.ts` takes a locale. For `es` it returns each entry's Spanish version when one exists and the English entry otherwise (marked `fallbackLocale: 'en'`); detail getters return `undefined` only when the entry exists in neither locale, and the page responds 404. Pages never implement fallback themselves.

A page served from English fallback under `/es` gets `<main lang="en-US">`, its canonical points at the English URL and it lists no `es-VE` alternate. Translated pages are their own canonical and list both locales (`hreflang`), via the `alternates` prop on `PageLayout`. A static page counts as translated once its Spanish SEO title (`seo.title`) is filled in (`getPageCopy` in `src/lib/content/index.ts`); its other texts may still fall back to English. A CMS item counts as translated when it has a Spanish version, and a Spanish version is only shown while its English one is live.

## Copy slots

Text is declared in code as **copy slots** (`src/lib/copy.ts`) and stored in EmDash in one **copy collection per manifest** (`copy_home`, `copy_ways_to_give`, `copy_events_detail`, `copy_site`…), one row per slot per locale:

| Where | Declares | Route |
| --- | --- | --- |
| `src/pages/<page>/_copy.ts` | a page's text and SEO (`seo.title`, `seo.description`, `seo.image`) | the page route, e.g. `/ways-to-give` |
| `src/pages/<collection>/_copy.detail.ts` | the fixed text of a detail template, shared by every item | e.g. `/events/*` |
| `src/copy/_copy.ts` | site-wide interface text (header, footer, forms, buttons, labels) | `_global` |

Each slot has a key, an editor-facing label, a format (`plain`, `rich`, `image`), a maximum length and an English default (the live site's text). Pages read slots with `getPageCopy(manifest, locale)`; components read site-wide text with `getGlobalCopy(Astro)`. A slot resolves to its value in the requested locale, then English, then the default from code.

- Plain slots render as escaped text. Rich slots render through Portable Text, limited to paragraphs, h2–h4, quotes, lists, bold, italic and safe links (`sanitizeRich`).
- Placeholders such as `{year}` or `{date}` are filled in code with `fill()`.
- Link targets, images, layout and classes stay in code; only text is a slot.
- `src/lib/copyLint.test.ts` fails CI if a page gains hardcoded visible text or passes copy to `set:html`.

Content that belongs to one CMS item (for example the 2026 tournament's earthquake-relief appeal) is a field on that collection, not template copy.

### How the admin is organized

`src/lib/cmsNavigation.mjs` is the single source for the admin sidebar: the folders (*Pages & SEO*, *CMS collections*, *Banner*), each copy collection's page name, description and position (`COPY_PAGES`), every other collection's label, description, folder and order, and hidden collections (`pages`). `src/lib/copyCollections.mjs` defines the copy collections' fields and numbers each slot: SEO slots first, then content in declaration order, shown as titles like `01 · SEO · Title`, so sorting by Title in the admin gives page order; `value` is searchable, so the list's search box finds a slot by its text. The seed (`npm run migrate:transform`) and `npm run cms:schema` both read these modules; `src/lib/cmsNavigation.test.ts` fails when a manifest or a seed collection isn't placed.

### Applying the schema to an existing CMS

`npm run cms:schema` (with `EMDASH_ADMIN_TOKEN`, an admin token with `schema:read` + `schema:write`, and `EMDASH_URL`) creates missing copy collections and fields and updates every collection's sidebar settings. It never touches menus, settings or content, and a second run changes nothing; `--dry-run` shows what it would do. Don't use `emdash seed --on-conflict update` on a live CMS: it rebuilds menus and overwrites site settings.

Upgrading a CMS that still has the old single `page_copy` collection, once per environment, **before** deploying the new code (run both commands from a checkout of the new code, pointed at the environment with `EMDASH_URL`):

1. `npm run cms:schema -- --dry-run`, review, then `npm run cms:schema`.
2. `npm run migrate:copy-collections` moves each slot's published value, any open draft (kept as a draft) and its Spanish version into the page's collection, then hides `page_copy` from the sidebar (kept, not deleted; revision history isn't carried over). Re-running changes nothing.
3. Deploy the code. Its sync fills any slot still missing when it starts.

The running (old) site keeps reading `page_copy` until the deploy, so nothing changes for visitors in between. Pause copy edits from step 2 until the deploy: edits to the hidden `page_copy` would be lost, and edits in the new collections only show after it. Deploying first instead would show every page's default copy until the migration ran.

### Adding a page

Add the page's `_copy.ts`, add it to `COPY_PAGES` in `src/lib/cmsNavigation.mjs` (name and position in the sidebar), then run `npm run cms:schema` in each environment. Until then the page renders its defaults and the sync reports its collection as missing; it never creates collections itself.

### Adding or changing a slot

1. Declare it in the page's `_copy.ts` (or the template's `_copy.detail.ts`, or `src/copy/_copy.ts`) with the current English text as `default`.
2. Use it in the page: `copy['my.key']` (or `t['my.key']` for site-wide text).
3. Start the server: the static-page sync (first request after start, needs `EMDASH_SYNC_PAT`) creates the English row with the default and an empty Spanish row, and updates labels, formats and limits that changed in code. It never overwrites a value, never publishes over an editor's draft, and flags slots removed from code as stale instead of deleting them.

## Spanish content from the live site

The migration (`scripts/migrate/`) reads both locales:

- `npm run migrate:extract` writes the English snapshot to `snapshot/` and the Spanish one to `snapshot/es/` (same parsers; Spanish slugs match English ones).
- `npm run migrate:transform` adds a Spanish entry, linked as a translation, for every English entry with a live Spanish version, plus copy collection rows for every slot, and the collections themselves (organized per `cmsNavigation.mjs`).
- `npm run migrate:copy` aligns each live English page with its `/es` version and translates every slot default, writing `seed/page-copy.es.json`. A page's slots are translated from that page's own live pair first (shared interface text from all pages); pages with no live Spanish version (e.g. Our Programs, the blog) are left untranslated for marketing rather than half-translated. Slots with no live counterpart are listed in `scripts/migrate/report.md` and fall back to English.
- Slots with no live Spanish counterpart can get a reviewed translation in `MANUAL_TRANSLATIONS` (`scripts/migrate/pagecopy.mjs`). It's merged into `seed/page-copy.es.json` and never overwritten by alignment.
- `npm run migrate:import-copy` fills empty Spanish slots in a running EmDash from that file (needs `EMDASH_SYNC_PAT`; never overwrites an editor's text).

Child data stays out of the repository in both locales (`snapshot/es/children.json` is gitignored).
