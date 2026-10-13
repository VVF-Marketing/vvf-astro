---
title: Component Library
description: Where components live and how the atomic-design tiers are organized.
---

All 28 components live flat in [`src/components/`](https://github.com/anclist/vvf-astro/tree/main/src/components) — there are no physical `atoms/`, `molecules/`, `organisms/` subfolders on disk. The atomic-design tiering exists only as Storybook `title:` metadata on each component's `.stories.ts` file.

## Tiers

| Tier | Components |
| --- | --- |
| Atoms | AnnouncementBanner, Badge, Button, Card, Eyebrow, TeamMemberCard, TextArea, TextField |
| Molecules | AuctionItemCard, BlogCard, ChildCard, ContactForm, ContentTable, DonationAmountWidget, EmployerMatchWidget, EventCard, FaqAccordion, ImpactBanner, LogoCarousel, NewsletterSignup, PastelCard, SponsorshipTierTable, StatTileRow, TicketCard, TestimonialCarousel |
| Organisms | ChildProfile, Footer, Header, Hero |

`TeamMemberCard` is filed under Atoms in Storybook despite being a "Card" component like the Molecules-tier cards — double-check with the team before assuming it's intentional rather than a miscategorization.

## Rich text from the CMS

Portable Text bodies (resource pages, the privacy policy) render through `PortableBody`, inside `RichText` for the prose styles. `PortableBody` uses EmDash's components except for tables, which use `ContentTable`.

`ContentTable` matches the live `.article_body` tables:
- a white card with a `table-border` outline and 16px radius;
- dividers between rows only;
- a `sky` header row and a semibold first column;
- 16px text with a 27px line height; 14px text with tighter padding below 480px.

Editor formatting wins over these defaults: a cell's alignment, column widths, merged cells and header cells. Tables wider than the screen scroll sideways inside the card. A paragraph right after a table renders as a small `table-note` source note, as on the live site. The layout logic is in `src/lib/contentTable.ts` (unit-tested) and reuses EmDash's table normalization.

## Browsing components

```bash
npm run storybook
```

Opens Storybook at `http://localhost:6006` with live examples, controls, and docs for every component. There is currently no hosted/deployed Storybook (no Chromatic or Pages step in CI), so this is a local-only workflow for now.
