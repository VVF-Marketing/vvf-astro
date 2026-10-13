---
title: Architecture & Content Model
description: How content flows from EmDash into pages and components.
---

## One adapter rule

All content is read through one adapter (every getter takes a locale and handles Spanish → English fallback — see [Localization & Page Copy](/localization-and-copy/)), [`src/lib/content/index.ts`](https://github.com/anclist/vvf-astro/blob/main/src/lib/content/index.ts), which wraps EmDash's `getEmDashCollection`/`getEmDashEntry` and returns the normalized shapes defined in [`src/lib/content/types.ts`](https://github.com/anclist/vvf-astro/blob/main/src/lib/content/types.ts). Pages and components never query EmDash directly — this keeps the CMS shape swappable and the rendering layer simple.

Normalized types: `EventItem`, `ChildItem`, `TeamMemberItem`, `PostItem`, `Sponsor`, `SponsorshipPackage`, `AuctionItem`, `Faq`, `CampaignUpdate`, `CampaignSettings`, `NavItem`.

## `seed/seed.json` is the schema source of truth

`seed/seed.json` defines both the EmDash collection **schema** (fields, types, validation) and the starter **content**, and is version-controlled. It has four top-level sections: `version`, `meta`, `collections` (schema), and `content` (seed data), plus `menus` (nav structure).

Collections: `events`, `children` (sponsorship profiles), `team_members`, `posts` (blog), `sponsors`, `sponsorship_packages`, `auction_items`, `faqs`, `campaign_updates`, `campaign_settings` (singleton), `resources` (financial reports carry a `report_kind`, annual or quarterly, which lists them on Financials & Transparency), `testimonials` (real, consented quotes only; the Our Programs testimonials section is hidden while it's empty), one `copy_*` collection per page, detail template and site-wide text (copy slots: page text, SEO and interface text; see [Localization & Page Copy](/localization-and-copy/)), and `pages` (the sync-maintained page inventory, hidden from the admin sidebar). The sidebar's folders, names and order come from `src/lib/cmsNavigation.mjs`. Every collection except `pages` keeps drafts and revisions. Entries exist per locale (`en`, `es`), linked as translations.

To change the schema or seed content: edit `seed/seed.json`, then `npm run seed` (or just restart the dev server — EmDash auto-seeds on boot if the database doesn't have content yet).

The `children` collection has a `published` flag gated behind "safeguarding sign-off" per its field description — unpublished child profiles should never render on the public site regardless of what other data exists on the record.

## Storage

Local dev uses SQLite (`data.db`) and local disk (`/uploads`) for EmDash. **Production deploy target (hosting, database, media storage) has not been decided yet** — don't assume a target when working on deploy-related changes; check with the team.

## Nav menus

`seed/seed.json`'s `menus` define the site's primary navigation, one menu per locale (English, and Spanish with `/es` links): Make a Difference, About and Resources dropdowns, as on the live site. [`scripts/verify-menu-links.mjs`](https://github.com/anclist/vvf-astro/blob/main/scripts/verify-menu-links.mjs) cross-checks every menu URL against real `src/pages` routes and is gated in CI (`verify-menu-links.yml`) — a broken nav link fails the build before merge.

## Design history

The `openspec/` directory holds archived change proposals and specs from earlier in the project (including the CMS choice evolution before landing on EmDash). It's not kept in sync with the current implementation, but it's worth a look for the "why" behind older decisions.
