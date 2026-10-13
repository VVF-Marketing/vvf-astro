## Why

Links that leave the site (sponsor websites, Donorbox, Candid, social profiles, partner pages, links editors put in CMS content) should open in a new tab, so visitors keep their place on the foundation's site.

Today this is inconsistent:
- **Live:** most external links open in the same tab. On the home page, only 8 of 55 open a new tab.
- **Locally:** none of the 53 external links on the home page do.
- **In code:** a handful of components (`TicketCard`, `ContactCta`, `SpecialOpportunities`, `EmployerMatchWidget`, `WhatWhenWhere`) set `target="_blank"` themselves. Everything else doesn't, including CMS content, the footer and logo carousels.

## What Changes

- **Every link to another website opens in a new tab**, across every page and both locales. It doesn't matter whether the link was written in code, by an editor in the CMS, or migrated from Webflow. "Another website" means an `http(s)` link whose host isn't the foundation's.
- **Unchanged:** links to the site itself (paths, or the site's full address), anchors, `mailto:` and `tel:` links, and the language switch.
- **New-tab links get `rel="noopener"`.** Partners and Donorbox still see the visit came from the foundation's site: no `noreferrer` is added where a component didn't already set it.
- **Screen-reader cue:** each external link's accessible name ends with "(opens in a new tab)", in the page's language ("(se abre en una pestaña nueva)" on /es). It's visually hidden; nothing changes in the design. The text is a site-wide copy slot that marketing can edit.
- **Applied once, at render time:** in the same HTML pass that already localizes same-site links (`src/lib/localizeLinks.ts`, run by the middleware). Per-component `target` code becomes redundant and is removed.
- **Manual Spanish translations:** a small, reviewed translation table for slots with no live-site counterpart, starting with this one, feeds `seed/page-copy.es.json`.

## Capabilities

### New Capabilities
- `external-links`: how links to other websites behave (new tab, `rel`, screen-reader cue), and what counts as external.

### Modified Capabilities
<!-- none: same-site link localization is unchanged -->

## Impact

- **Code:**
  - `src/lib/localizeLinks.ts`, or a sibling `externalLinks.ts` called from the same pass;
  - `src/middleware.ts` (passes the cue text);
  - `src/copy/_copy.ts` (new `a11y.newTab` slot);
  - the five components listed above (drop their own `target`/`rel` code);
  - `scripts/migrate/pagecopy.mjs` (manual translations).
- **Content:** none changed. CMS links get the behaviour at render time.
- **Tests:** unit tests for link classification and rewriting; e2e for target/rel and the cue in both locales, and for same-site, mailto and anchor links staying as they are.
- **Docs:** `localization-and-copy.md` (links section), `marketing-guide.md` (linking section).
- **Stack:** PR 11, based on `stack/10-table-style`.
