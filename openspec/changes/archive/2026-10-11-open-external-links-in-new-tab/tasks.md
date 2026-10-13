## 1. Link rewriting

- [x] 1.1 Add `src/lib/externalLinks.ts` with `isExternalHref` and `openExternalLinks(html, cue)` (D1, D2). Verify with `src/lib/externalLinks.test.ts`, covering:
  - external vs same-site (path, `/es`, full address with and without `www`), `#`, `mailto:`, `tel:`, protocol-relative;
  - `target`/`rel` added, an existing `rel` merged, an existing `target` respected (no cue);
  - an `aria-label` link gets the cue in its label; an image-only link and a text link get the hidden span;
  - quotes, attribute order, multi-line tags, and HTML in the cue escaped.
- [x] 1.2 Add the `a11y.newTab` slot to `src/copy/_copy.ts` (default `(opens in a new tab)`, max 40) and run it in `src/middleware.ts` after `localizeLinks`, with the cue from `getPageCopy` in the page's locale and the default if that fails (D3). Verify unit tests pass and that a built page's external links have `target="_blank"`, `rel` with `noopener`, and the cue.

## 2. Spanish cue

- [x] 2.1 Add `MANUAL_TRANSLATIONS` to `scripts/migrate/pagecopy.mjs`, merged into `seed/page-copy.es.json` without being overwritten by alignment, with `_global` `a11y.newTab` → `(se abre en una pestaña nueva)` (D4). Regenerate the seed. Verify with a unit test that manual entries survive alignment, and that the seed has the Spanish row.

## 3. Components

- [x] 3.1 Remove the per-component `target`/`rel` code from `TicketCard`, `ContactCta`, `SpecialOpportunities`, `EmployerMatchWidget`, `WhatWhenWhere` and `LogoCarousel` (D5). Verify the Storybook tests pass and the event page's ticket and opportunity links still open in a new tab (e2e in 4.1).

## 4. Tests and docs

- [x] 4.1 e2e (`e2e/external-links.spec.ts`):
  - on `/`, `/es`, `/ways-to-give` and `/events/2026-golf-tournament`, every external link has `target="_blank"`, a `rel` containing `noopener`, and an accessible name ending with the cue in the page's language;
  - same-site, `mailto:` and anchor links have no `target`;
  - no visible cue text;
  - across every page in the sitemap, no external link lacks `target`.

  Verify against the built site.
- [x] 4.2 Document the rule in `docs-site/src/content/docs/localization-and-copy.md` (links section) and `marketing-guide.md` (linking section: links to other sites open in a new tab automatically; editors don't need to set anything). Verify the docs build.
- [x] 4.3 Run the unit tests, Storybook tests, menu check and e2e on the built site, and report the results.
