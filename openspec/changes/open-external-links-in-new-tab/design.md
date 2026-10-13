## Context

See proposal.md (Why).

- **Existing link pass:** every HTML response already goes through one pass in `src/middleware.ts` (`withLocalizedLinks` → `localizeLinks`, `src/lib/localizeLinks.ts`), which rewrites same-site `href`s to the page's language. `sameSitePath` in `src/lib/site.mjs` already decides "is this the foundation's own site" for full addresses (http/https, with or without `www`).
- **Request context:** EmDash's middleware runs first (`order: "pre"`) and wraps the request in its context (`runWithContext`), so our middleware can read CMS copy with `getPageCopy`.
- **Links named by an image:** sponsor and partner logo links and the footer's social icons are named by the image's `alt` (`<a><img alt="Instagram"></a>`). Text inside the link extends that name, so a visually hidden span works for them too.
- **Per-component code:** some components set `target`/`rel` themselves. `SpecialOpportunities`, `TicketCard` and `ContactCta` do it only for `http(s)` links; `EmployerMatchWidget` and `WhatWhenWhere` always do. Several also add `noreferrer`.

## Goals / Non-Goals

**Goals:**
- One rule for all pages and content, applied where links are already normalized.
- An editable, translated screen-reader cue.

**Non-Goals:**
- A visible icon.
- Changing the URLs themselves.
- Treating `mailto:`/`tel:` as external.
- Opening same-site PDFs or media in new tabs: they're same-site, so the rule doesn't cover them.
- Iframes and form posts (Donorbox embeds stay as they are).

## Decisions

### D1. Rewrite external `<a>` tags in the existing HTML pass
`src/lib/externalLinks.ts` exports `isExternalHref(href)` and `openExternalLinks(html, cue)`. The middleware runs it right after `localizeLinks`, in the same response pass.
- **What counts as external:** it matches `^https?://` (or protocol-relative `//`) and `sameSitePath(href)` is undefined. Everything else is untouched: paths, `#…`, `mailto:`, `tel:`, `javascript:`, and full same-site addresses (which `localizeLinks` has already turned into paths).
- **Why at render time:** a component wrapper or a Portable Text link mark would miss CMS rich text rendered by EmDash, migrated HTML, menus and future components. The middleware already parses every link, so one more attribute pass costs little and covers everything.

**Rejected:**
- Client-side JavaScript that sets `target` on load: it runs after paint, does nothing without JS, and is invisible to crawlers' link audits.
- A rehype/remark plugin: content isn't Markdown, and EmDash renders Portable Text itself.

### D2. Attribute rules
For each external `<a …>` opening tag:
- **`target`:** if there's none, add `target="_blank"`. If one is present (e.g. an explicit `target="_self"`), keep it and skip the link entirely, cue included. That gives code an opt-out.
- **`rel`:** add `noopener` to any existing `rel`, de-duplicated (`rel="sponsored"` → `rel="sponsored noopener"`). Don't add `noreferrer`: donation and partner analytics rely on the referrer, and with `noopener` the opened page can't reach `window.opener`.
- **Cue with `aria-label`:** if the tag has an `aria-label`, append " " + cue to it; a hidden span inside wouldn't be read when `aria-label` sets the name.
- **Cue otherwise:** insert `<span class="sr-only"> (cue)</span>` before the matching `</a>`. `<a>` can't nest, so the next `</a>` after the opening tag is the right one. The regex works on `<a\b[^>]*>[\s\S]*?</a>`.

Tags with `hreflang` (the language switch) are same-site, so they aren't affected.

### D3. The cue is a site-wide copy slot
`a11y.newTab` in `src/copy/_copy.ts`, default `(opens in a new tab)`, max length 40. The middleware resolves it once per HTML response with `getPageCopy(globalCopy, locale)`; the query is cached per request by EmDash. The text is HTML-escaped before it's inserted. If the copy lookup fails, it falls back to the default from code, so a CMS outage never breaks links.

**Rejected:** a hard-coded string in `externalLinks.ts`, which marketing couldn't edit or translate, and which the copy rules forbid.

### D4. Spanish text from a reviewed manual table
`scripts/migrate/pagecopy.mjs` gains `MANUAL_TRANSLATIONS`: `{ route: { key: text } }` for slots with no live-site counterpart, starting with `_global` / `a11y.newTab` → `(se abre en una pestaña nueva)`. It's merged into `seed/page-copy.es.json` after alignment, and alignment never overwrites it. Fresh databases get it from the seed; existing ones from `npm run migrate:import-copy`, which only fills empty Spanish slots and never touches edits. Marketing can change it in the CMS like any slot.

### D5. Remove per-component new-tab code
`TicketCard`, `ContactCta`, `SpecialOpportunities`, `EmployerMatchWidget` and `WhatWhenWhere` drop their `target`/`rel` logic; the pass handles them. That keeps behaviour in one place and avoids a component's `target` making the pass skip the cue (D2). `LogoCarousel`'s `rel="noopener"` goes too.

## Risks / Trade-offs

- **[Regex HTML rewriting misses odd markup]** → `localizeLinks` already does the same kind of tag rewriting on every page. Unit tests cover single and double quotes, attribute order, multi-line tags, existing `rel`/`target`/`aria-label`, and nested markup inside links. The e2e checks every page in the sitemap for external links missing `target` or the cue.
- **[Cost on large pages]** → It's one extra regex pass over HTML that's already in memory. The home page has about 55 external links.
- **[Too many new tabs]** → It's what the user asked for. A component can opt out with an explicit `target="_self"`.
- **[Donorbox popup buttons]** → Donorbox's popup script intercepts clicks on its buttons. With the script, the modal opens as before; without it, the checkout opens in a new tab. Both are acceptable.

## Migration Plan

Code only, plus one copy slot. After deploying, run `npm run migrate:import-copy` once per environment to fill in the Spanish cue. Rollback is a revert.
