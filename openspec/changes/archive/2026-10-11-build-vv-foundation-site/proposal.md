## Why

Victoria Venezuela Foundation needs its public website built. A Figma-exported design reference (`Victoria Venezuela Foundation.pdf`, 65 pages: nav map + CTA audit + every page screen + a "Team V2 Proposed" content update) defines the actual pages, visual language, and content shape. The repo currently has only a placeholder `index.astro`. The earlier `implement-vv-foundation-website` change wrote generic, page-agnostic specs (11 lines each) before this reference existed and never got applied to code — it does not reflect the real design and is superseded by this change.

## What Changes

- Define design tokens (colors, type, spacing, radii) matching the PDF's visual language: navy/sky-blue palette, three-color pastel program-card system, pill buttons, rounded-2xl cards.
- Build the full reusable component set the pages need: header/banner/footer, hero, stat-tile row, program card, dark impact banner, event card, sponsorship-tier table, child card/profile, FAQ accordion, team card, blog card, testimonial carousel, newsletter signup, silent-auction card, ticket card.
- Define Sanity CMS schemas for: events, sponsored children, team members (board/leaders/staff tiers), blog posts, sponsors/partners, sponsorship packages, silent-auction items, FAQs, earthquake-relief updates.
- Build the Astro pages and sub-pages: Home, Our Team (+ member detail), Sponsor a Child (+ child list + child detail/donate), Ways to Give, Events (+ event detail), Blog (+ article), Contact, Privacy Policy, Earthquake Relief campaign.
- Integrate Donorbox for donations, sponsorships, and event ticketing per the nav map's resolved CTA targets (event ticketing, sponsorship form, campaign donation links).
- Team content targets the PDF's "V2 Proposed" roster (real board/leadership/staff), not the original placeholder version.
- Terms of Use and Donor Bill of Rights are out of scope: footer links exist but pages are not built until copy is provided.

## Capabilities

### New Capabilities
- `design-system`: color/type/spacing/radius tokens and the shared visual language (pastel program-card system, pill buttons, dark navy sections).
- `component-library`: the reusable Astro components listed above, covering every page's building blocks.
- `cms-collections`: Sanity schemas for events, children, team members, blog posts, sponsors, sponsorship packages, silent-auction items, FAQs, earthquake-relief updates.
- `front-end`: the Astro pages/routes and their composition from components + CMS content.
- `donation-integration`: Donorbox embeds for one-time/recurring donation, child sponsorship, corporate sponsorship, and event ticketing flows.

### Modified Capabilities
- None. (`implement-vv-foundation-website` is a separate, unapplied change left as-is.)

## Impact

- `src/` — new pages, layouts, components, styles (Tailwind tokens).
- `src/content/` or Sanity client integration — CMS schema + fetch layer, depending on `design.md` decisions.
- New dependency: Sanity client (and Sanity Studio config, likely as a `studio/` workspace).
- Donorbox: no new package, iframe/link embeds only, using the campaign/event IDs the nav map already resolved.
- No change to `implement-vv-foundation-website`; it remains complete-but-unapplied and out of scope here.
