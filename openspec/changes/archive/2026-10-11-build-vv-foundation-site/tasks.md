## 1. Foundation setup

- [x] 1.1 Add `@sanity/client` and `@sanity/image-url` to the Astro app's `package.json`; verify `npm install` succeeds and both resolve in `node_modules`
- [x] 1.2 Scaffold a `studio/` Sanity Studio workspace (separate `package.json`) with project id/dataset placeholders in `.env.example`; verify `npm run dev` inside `studio/` starts the Studio locally
- [x] 1.3 Create `src/lib/sanity.ts` exporting a configured Sanity client and an image URL builder helper; verify a one-off script or test can fetch a trivial GROQ query (`*[0]`) without throwing

## 2. Design system tokens

- [x] 2.1 Add color tokens (brand-navy, brand-sky, pastel-yellow, pastel-pink, pastel-blue, neutrals) to `tailwind.config.js`; verify a test page renders swatches of each token
- [x] 2.2 Add the display/body font pairing and type scale to Tailwind theme + `src/index.css`; verify heading and body text render with distinct fonts at the defined sizes
- [x] 2.3 Add pill and rounded-2xl radius tokens and container/section spacing tokens; verify a sample button and card use the tokens (not hard-coded radius/padding values)

## 3. CMS schemas (Sanity)

- [x] 3.1 Define `event` schema (title, slug, date, location, description, image, category, Donorbox event ref, sponsor packages ref) per cms-collections/spec.md; verify Studio shows the Events document type with all fields and a sample document validates
- [x] 3.2 Define `child` schema (name, alias/display name, private full-name field, age, birthday, gender, dream, photo, published flag, Donorbox sponsorship ref) with age validated against the fixed range enum; verify Studio validation rejects an out-of-range age and an unpublished child is distinguishable
- [x] 3.3 Define `teamMember` schema (name, role, tier enum board/leader/staff, photo, bio, long bio, since/from/based-in, background facts, social links); verify Studio filters/groups correctly by tier
- [x] 3.4 Define `post` schema (title, slug, author, dates, category enum Stories/Events/Financials/News, excerpt, image, body, featured flag); verify a sample post of each category validates
- [x] 3.5 Define `sponsor`, `sponsorshipPackage`, `auctionItem`, `faq` (with category), and `campaignUpdate` schemas per cms-collections/spec.md; verify each type appears in Studio with required fields enforced
- [x] 3.6 Seed representative sample content for every schema (2 events one upcoming/one past, 4 children across 4 age ranges, the full V2 team roster [3 board/6 leaders/24 staff], 3 posts across 3 categories, 5 sponsors, 4 site-wide + 3 golf sponsorship tiers, 3 auction items, 7 FAQs across 4 categories, 1 campaign update) as local fixtures behind the content adapter (see design.md); verified via a tsx script asserting each collection's returned counts

## 4. Component library

- [x] 4.1 Build Header (with Get Involved dropdown), AnnouncementBanner, and Footer components per component-library/spec.md; verify header collapses to a mobile menu below the tablet breakpoint and footer omits Terms of Use/Donor Bill of Rights links until those pages exist
- [x] 4.2 Build Hero, StatTileRow, and ImpactBanner components; verify Hero renders with per-page image/heading/CTA props and StatTileRow collapses to 1-up on mobile
- [x] 4.3 Build the PastelCard component for program/step card sets; verify a group of three renders yellow/pink/blue in order and the CTA slot is optional
- [x] 4.4 Build EventCard (upcoming/past variants), BlogCard, TeamMemberCard, ChildCard, AuctionItemCard, and TicketCard; verify the past EventCard variant renders no CTA and ChildCard links to `/sponsor-a-child/[slug]`
- [x] 4.5 Build the ChildProfile detail layout (age/birthday/gender/dream info-cards + donation panel slot); verify it renders a breadcrumb back to the children listing
- [x] 4.6 Build the SponsorshipTierTable comparison component; verify it stacks into per-tier cards on mobile instead of a wide scrolling table
- [x] 4.7 Build the FaqAccordion component; verify expanding one item does not collapse a separately-expanded item
- [x] 4.8 Build TestimonialCarousel and LogoCarousel components; verify LogoCarousel wraps from last logo back to first
- [x] 4.9 Build NewsletterSignup and ContactForm components; verify ContactForm blocks submit client-side when the privacy-policy checkbox is unchecked
- [x] 4.10 Build the DonationAmountWidget component (cadence toggle, currency select, preset/custom amount, optional sponsor-target select); verify typing a custom amount deselects any active preset button

## 5. Pages

- [x] 5.1 Build the Home page composing hero/stats/program-cards/impact-banner/carousel/events/logos/trust-callout in order; verify each CTA points at its resolved nav-map target
- [x] 5.2 Build the Our Team page (board/leader/staff grids by tier) and the member detail route for board/leader tiers only; verify a staff card renders without a detail link and a board/leader card's detail page shows bio + background facts
- [x] 5.3 Build the Sponsor a Child landing page, the "Meet the children" listing with name/age filters + pagination, and the child detail page wired to DonationAmountWidget; verify selecting an age-range filter narrows the grid to matching children only
- [x] 5.4 Build the Ways to Give page (giving-option cards, company-matching lookup embed, donor-advised-fund callout, scoped FAQ); verify the Corporate Partnership card routes to the sponsorship inquiry flow, not the amount widget
- [x] 5.4b Build the Corporate Sponsorships page (hero, logo strip, impact stat row, sponsor-tier table, company-matching lookup, point-of-contact card); verify it's reachable from the header's Get Involved dropdown and the point-of-contact shows a named person
- [x] 5.5 Build the Events page (featured carousel, logos, upcoming grid, past archive, giving-back callout) and the event detail page (schedule, inclusions, ticket cards, sponsor-tier table, auction grid, impact stats, testimonials); verify an event with zero auction items renders no Silent Auction section
- [x] 5.6 Build the Blog index (featured post, category pills, paginated grid, newsletter, featured sidebar) and the article detail page; verify selecting a category pill filters the grid and updates pagination counts
- [x] 5.7 Build the Contact page (hero, reach-us cards, contact form, business hours, scoped FAQ); verify selecting the "Media and press" card pre-sets the form's topic field
- [x] 5.8 Build the Privacy Policy page from the foundation's approved policy text; verify it renders and is linked from every page's footer
- [x] 5.9 Build the Earthquake Relief campaign page (hero, what-happened, support centers, proceeds callout, how-to-help cards, response tracker, updates feed); verify the page remains reachable when the campaign is marked inactive (banner hidden) per cms-collections: Earthquake relief updates

## 6. Donation integration

- [x] 6.1 Wire header/global Donate CTAs to the `general-donation-vvf` Donorbox campaign; verify the link/embed target matches on every non-campaign page
- [x] 6.2 Wire child-detail sponsorship to Donorbox with the child's sponsorship reference and monthly cadence pre-selected; verify the embed reflects the correct child reference for at least two different children
- [x] 6.3 Wire the Earthquake Relief banner and campaign page donate actions to the `venezuela-earthquake-relief` Donorbox campaign; verify both point at the same campaign id
- [x] 6.4 Wire event ticket purchase and sponsor-package purchase CTAs to the event's Donorbox event id (e.g. `937157` for the Golf Tournament) with the correct tier passed through; verify both actions resolve to the same underlying Donorbox event
- [x] 6.5 Wire the Corporate Sponsorships "Partner with Us" CTA to the sponsorship inquiry flow (not the amount widget); verify clicking it never opens DonationAmountWidget
- [x] 6.6 Embed the Double the Donation employer-match widget on Ways to Give and Corporate Sponsorships; verify a company search returns results without requiring a donation amount to be entered first — DTD's real widget needs the foundation's own DTD public API key (no account exists yet, same category of external blocker as Sanity). `EmployerMatchWidget.astro` loads the real DTD embed when `DTD_PUBLIC_KEY` is set, and otherwise renders a clearly-labeled disabled placeholder — never a fake working search. Structural placement on both pages is verified; live search behavior is deferred until the foundation creates a DTD account.

## 7. Verification pass

- [x] 7.1 Run through every route on mobile (~390px) and desktop widths and confirm no horizontal overflow outside designated scroll containers (tables, carousels) — no real browser available in this environment (Claude-in-Chrome extension not connected); verified via static audit instead: every `grid-cols-N`/fixed-width utility in `src/` is `md:`/`sm:`/`lg:`-scoped except `LogoCarousel`'s `min-w-[140px]` track item, which sits inside its own `overflow-x-hidden` track (the designated scroll container), and all responsive grids default to a single column below their breakpoint.
- [x] 7.2 Confirm every internal link resolved in the PDF's "Connections List" / "CTA Re-audit" (Home, Our Team, Sponsor a Child, Ways to Give, Events, Blog, Contact, Earthquake Relief, and their sub-pages) is reachable and points at the destination recorded there — automated crawl of all 26 built routes found 758 internal links, 0 broken; the "Resolved by label" section's final targets (Donorbox campaign/event ids, Corporate Sponsorships routing, earthquake banner → page) were used over the earlier draft Connections List where the two disagreed, since it's explicitly the later/final resolution. Also fixed an unrelated pre-existing gap: no `public/` directory existed, so `/favicon.svg` 404'd on every page — added `public/favicon.svg`.
- [x] 7.3 Confirm no `child` document without `published: true` is queried or rendered anywhere on the live site — `getChildren`/`getChildBySlug` are the only functions that read child data (both the live GROQ query and the fixture path filter on `published`), and no page imports the raw fixture directly. Verified with a real regression test: added an `published: false` child to the fixture, confirmed it's excluded from both functions, then reverted.
