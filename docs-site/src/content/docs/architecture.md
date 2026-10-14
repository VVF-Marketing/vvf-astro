---
title: Architecture & Content Model
description: How content flows from EmDash into pages and components.
---

## One adapter rule

All content is read through one adapter (every getter takes a locale and handles Spanish → English fallback — see [Localization & Page Copy](/localization-and-copy/)), [`src/lib/content/index.ts`](https://github.com/anclist/vvf-astro/blob/main/src/lib/content/index.ts), which wraps EmDash's `getEmDashCollection`/`getEmDashEntry` and returns the normalized shapes defined in [`src/lib/content/types.ts`](https://github.com/anclist/vvf-astro/blob/main/src/lib/content/types.ts). Pages and components never query EmDash directly — this keeps the CMS shape swappable and the rendering layer simple.

Normalized types: `EventItem`, `ChildItem`, `TeamMemberItem`, `PostItem`, `Sponsor`, `SponsorshipPackage`, `AuctionItem`, `Faq`, `CampaignUpdate`, `CampaignSettings`, `NavItem`.

## `seed/seed.json` is the schema source of truth

`seed/seed.json` defines both the EmDash collection **schema** (fields, types, validation) and the starter **content**, and is version-controlled. It has four top-level sections: `version`, `meta`, `collections` (schema), and `content` (seed data), plus `menus` (nav structure).

Collections follow the VVF spec's content model (`src/lib/contentModel.mjs`): `events`, `event_offers`, `benefit_rows`, `auction_items`, `testimonials` (real, consented quotes only), `faqs`, `children` (sponsorship profiles), `team_members` (one record per person), `articles` (financial reports carry a `report_type`, annual or quarterly, which lists them on Financials & Transparency), `categories`, `authors`, `partners` and `site_facts`; plus `corporate_tiers`, `donorbox_settings` (the Donorbox campaign IDs) and `campaign_settings` (the site banner, singleton), one `copy_*` collection per page, detail template and site-wide text (copy slots: page text, SEO and interface text; see [Localization & Page Copy](/localization-and-copy/)), and `pages` (the sync-maintained page inventory, hidden from the admin sidebar). The sidebar's folders, names and order come from `src/lib/cmsNavigation.mjs`. Every collection except `pages` keeps drafts and revisions. Entries exist per locale (`en`, `es`), linked as translations.

To change the schema or seed content: edit `seed/seed.json`, then `npm run seed` (or just restart the dev server — EmDash auto-seeds on boot if the database doesn't have content yet).

A child profile is public once it's published, and only the safeguarding team can publish one (see [Marketing Access](/marketing-access/)). The `children` collection has only the spec's fields (4.3, "add none"), plus the Donorbox reference (Q5); there's no separate safeguarding flag.

## Storage

Local dev uses SQLite (`data.db`) and local disk (`/uploads`) for EmDash. **Production deploy target (hosting, database, media storage) has not been decided yet** — don't assume a target when working on deploy-related changes; check with the team.

## Nav menus

`seed/seed.json`'s `menus` define the site's primary navigation, one menu per locale (English, and Spanish with `/es` links): Make a Difference, About and Resources dropdowns, as on the live site. [`scripts/verify-menu-links.mjs`](https://github.com/anclist/vvf-astro/blob/main/scripts/verify-menu-links.mjs) cross-checks every menu URL against real `src/pages` routes and is gated in CI (`verify-menu-links.yml`) — a broken nav link fails the build before merge.

## Design history

The `openspec/` directory holds archived change proposals and specs from earlier in the project (including the CMS choice evolution before landing on EmDash). It's not kept in sync with the current implementation, but it's worth a look for the "why" behind older decisions.
