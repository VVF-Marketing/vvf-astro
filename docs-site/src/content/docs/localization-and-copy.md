---
title: Localization & Page Copy
description: English and Spanish routing, translation fallback, and how page text lives in the CMS as copy slots.
---

The site serves **en-US** at unprefixed paths and **es-VE** under `/es`, as the live Webflow site did. All visible text — page copy, SEO, shared interface text — comes from the CMS, so editors change it without a deploy.

## Locales and routing

- `astro.config.mjs` declares the locales (`en` default, `es` under `/es`); EmDash reads them and stores one row per locale, with translations sharing a `translation_group`.
- Pages are written once. `src/middleware.ts` rewrites `/es/...` to the same page module; pages read their locale with `localeFromPath(Astro.originPathname)` (`src/lib/i18n.ts`).
- On every page the middleware makes links back into the site follow the page's language (`src/lib/localizeLinks.ts`): full addresses of the site (`src/lib/site.mjs`) become paths, and paths get `/es` on Spanish pages and lose it on English ones. Code keeps writing English paths, and CMS content works however editors wrote the link. Links carrying `hreflang` (the language switch) are left alone. The migration also stores same-site links as paths.
- Old Webflow `/es/...` URLs redirect once (301) to the Spanish project route, using the same table as the English redirects (`src/lib/legacyRoutes.mjs`).

## Fallback: Spanish → English → 404

Every content getter in `src/lib/content/index.ts` takes a locale. For `es` it returns each entry's Spanish version when one exists and the English entry otherwise (marked `fallbackLocale: 'en'`); detail getters return `undefined` only when the entry exists in neither locale, and the page responds 404. Pages never implement fallback themselves.

A page served from English fallback under `/es` gets `<main lang="en-US">`, its canonical points at the English URL and it lists no `es-VE` alternate. Translated pages are their own canonical and list both locales (`hreflang`), via the `alternates` prop on `PageLayout`. A static page counts as translated once its Spanish SEO title (`seo.title`) is filled in (`getPageCopy` in `src/lib/content/index.ts`); its other texts may still fall back to English. A CMS item counts as translated when it has a Spanish version, and a Spanish version is only shown while its English one is live.

## Copy slots

Text is declared in code as **copy slots** (`src/lib/copy.ts`) and stored in the EmDash `page_copy` collection, one row per slot per locale:

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

### Adding or changing a slot

1. Declare it in the page's `_copy.ts` (or the template's `_copy.detail.ts`, or `src/copy/_copy.ts`) with the current English text as `default`.
2. Use it in the page: `copy['my.key']` (or `t['my.key']` for site-wide text).
3. Start the server: the static-page sync (first request after start, needs `EMDASH_SYNC_PAT`) creates the English row with the default and an empty Spanish row, and updates labels, formats and limits that changed in code. It never overwrites a value, never publishes over an editor's draft, and flags slots removed from code as stale instead of deleting them.

## Spanish content from the live site

The migration (`scripts/migrate/`) reads both locales:

- `npm run migrate:extract` writes the English snapshot to `snapshot/` and the Spanish one to `snapshot/es/` (same parsers; Spanish slugs match English ones).
- `npm run migrate:transform` adds a Spanish entry, linked as a translation, for every English entry with a live Spanish version, plus `page_copy` rows for every slot.
- `npm run migrate:copy` aligns each live English page with its `/es` version and translates every slot default, writing `seed/page-copy.es.json`. A page's slots are translated from that page's own live pair first (shared interface text from all pages); pages with no live Spanish version (e.g. Our Programs, the blog) are left untranslated for marketing rather than half-translated. Slots with no live counterpart are listed in `scripts/migrate/report.md` and fall back to English.
- `npm run migrate:import-copy` fills empty Spanish slots in a running EmDash from that file (needs `EMDASH_SYNC_PAT`; never overwrites an editor's text).

Child data stays out of the repository in both locales (`snapshot/es/children.json` is gitignored).
