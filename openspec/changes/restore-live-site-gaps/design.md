## Context

- **Inputs.** The drift audit used the committed scrape (`scripts/migrate/snapshot/`, 2026-10-04) and, on 2026-10-21, the Webflow CMS API through the Webflow connector.
- **What has changed on live since the scrape:**
  - the 2026 event's long description and four images (2026-10-15);
  - Spirits Sponsor marked sold out (2026-10-08).
- **Already lost in the snapshot or seed:**
  - recap stat captions (`scripts/migrate/model.mjs` keeps only `value` and `label`);
  - paragraph-only offer text (`parse.mjs` reads includes as list items only);
  - the 2026 memories photos (the event `gallery` feeds the mosaic instead).
- **Half-built spec rule.** `event.registration` is never read by the page, so spec 7.8-2 only passes because its test skips: no seeded event is closed.
- **Network limits in this environment.** The live domain and `cdn.prod.website-files.com` are blocked, so pages can't be re-scraped. Webflow's S3 bucket serves the same asset files and is reachable.
- **Rules every task follows:**
  - all visible text in `_copy.ts` slots (`copyLint`);
  - Spanish in both `MANUAL_TRANSLATIONS` and `seed/page-copy.es.json`;
  - `seed/seed.json` rebuilt by `npm run seed`, never edited by hand;
  - colours from tokens only;
  - components reused, with variants as union-typed props.

## Goals / Non-Goals

**Goals:**
- Restore live content the spec allows, in both languages, through the migration pipeline, so a re-run keeps it.
- Make 7.8-2 real: closed or sold-out registration hides purchase links and shows the note.
- Give every page type the structured data and social tags answer engines and search engines expect.
- Make the comparison with live repeatable (`migrate:drift`).

**Non-Goals:**
- Anything the spec pass removed on purpose: contact reach-us cards, events-page headings, "Previous editions", home hero subtext, La Guaira caption wording. These went to Enrique (answers in `tasks.md` 4.5): the cards, the headings and the caption stay as built; "Previous editions" is restored (D13); the home hero subtext is still open.
- Empty live sections ("Thank you, donors", "What they said"); 7.8-4 hides them.
- Rendering the 2026 long description as a new page section. No spec row or live evidence places it, so it is stored only as the event's rich description.

## Decisions

### D1. Snapshot updates from the API, recorded in the report
- The three live changes are merged into the committed snapshot by hand, from the API responses read on 2026-10-21:
  - the Lounge paragraph, English and Spanish;
  - Spirits Sponsor sold out;
  - the 2026 long description, English and Spanish.
- Each is listed in `scripts/migrate/report.md` with its source and date.
- The parser and extractor are fixed in the same change, so the next real scrape produces the same values.
- *Alternative:* waiting for an allowlisted re-scrape. It delays three small, verified facts for no gain.

### D2. Long description: API wins, the snapshot keeps it otherwise
- `extract.mjs` sets each event's `descriptionHtml` from the API dump when credentials work. Without them, it carries the previous snapshot's value over, so a token-less run never erases it.
- `model.mjs` prefers `descriptionHtml` for the event's rich `description`; `summary` stays the short text.
- `content/index.ts` keeps mapping `description` from `summary`, so no page changes.

### D3. Paragraph offer text goes in `benefits`
- When `.od-includes` has no list items, the parser keeps its paragraphs as the offer's `benefits`.
- The model's existing `includes` portable text carries them, so there is no new CMS field.
- `TicketCard` and `SpecialOpportunities` already render `benefits`, so the text shows as the offer's one item. The lounge is sold out on live too, so its panel stays locked there and here.

### D4. Stat captions
- The `stats` repeater gains a `caption` sub-field (`contentModel.mjs`).
- `model.mjs` maps `label → caption` from the snapshot's recap stats.
- `index.ts` exposes `{ number, heading, label }` as before, with `label` now filled.
- The raised tile's caption is a new event-detail slot, `recap.raisedCaption`, since `amount_raised` is a single string.

### D5. Memories photos from the page, not the gallery
- The 2026 page snapshot (`snapshot/pages/events__2026-golf-tournament.json`, `es/` too) holds the memories section's five images and alts.
- The images are already harvested to `public/images/pages/*-vvf-golf2025-memories-*`.
- For an upcoming event, `mappers.mjs` builds `gallery` from that section when it exists, and falls back to the parsed gallery otherwise.
- Spanish alts come from the Spanish page snapshot.

### D6. Registration helper
- `registrationNotice(event)` in `src/lib/content/registration.ts` returns `'closed' | 'sold_out' | null`.
- The event page reads it once to hide every purchase link (hero CTA, TicketCard buttons, SpecialOpportunities links) and to show the note in a `Card` (tone `sun`). No new component.
- For CI, `SEED_FIXTURE_EVENTS=1` adds a made-up past-dated "closed" copy of an event. It follows `scripts/lib/fixture-children.mjs`, and the e2e job turns it on, so 7.8-2 runs.

### D7. Hero phone alt
- An optional `mobileImageAlt` prop.
- When set, Hero renders two `<picture>` elements, each with a `<source>` that serves a 1×1 transparent GIF data URI at the other breakpoint. Each width downloads only its own image, and each has its own alt.
- Without the prop, rendering is unchanged.

### D8. Structured data builders
- `structuredData.ts` gains `webSite`, `faqPage`, `breadcrumbList` and `person`, and an `ORG_ID` constant used by `orgRef`.
- `ngo()` gains `logo`, `image`, `contactPoint`, `areaServed` and a localized DonateAction.
- The LinkedIn `sameAs` becomes the company page URL.
- Pages pass the extra nodes through the existing `jsonLd` prop of `PageLayout`.
- `Layout.astro` gains `ogType` and `imageAlt` props, Twitter tags and `theme-color`, with the colour taken from `tokens.cjs` (`brand.primary`).

### D9. `llms.txt` from content
- A pure `buildLlmsTxt({ pages, events, reports, faqs, locale })` in `src/lib/llms.ts` is unit-tested.
- `src/pages/llms.txt.ts` gathers its inputs through the content layer.

### D10. Sitemap `lastmod`
- `getSitemapDetailPages()` returns each entry's `updated_at`, which the sitemap prints as `YYYY-MM-DD`.
- Static pages carry a date only where their copy collection reports one.

## Risks / Trade-offs

- [Hand-merged snapshot values drift from the next scrape] → The parser and extractor fixes make the scrape produce the same values. `migrate:validate` with a token compares them.
- [Two-`<picture>` hero could double downloads] → The 1×1 data-URI source prevents it. An e2e check counts image requests at 390 px.
- [Fixture event leaks into real content] → It only exists under `SEED_FIXTURE_EVENTS=1`, and its slug starts with `fixture-`.
- [Bigger JSON-LD validation surface] → Unit tests per builder, an e2e check per page type, and a manual validator.schema.org pass.

## Open Questions

- Whether the live page now renders the long description can only be confirmed once `www.victoriavenezuelafoundation.org` is allowed.

### D12. Card photo field
- Webflow keeps a separate card photo for event lists, cropped so the players are centered (Enrique). The hero photo puts its subject on the left for the hero text.
- The event gains an optional `card_photo` image. `extract.mjs` reads the CMS `card-photo` field with the long description (`withEventApiFields`): the API wins, an empty API value clears it, and a token-less run keeps the snapshot's.
- `EventCard` and the archive cards use it at every width, with no phone `<source>`, because the crop already suits both. Without it, the cards keep the hero photos. The event page and the JSON-LD keep using the hero.
- Only the 2026 event has one on Webflow.

### D13. "Previous editions" on past events
- The build never had this section: the migration didn't carry it over. Live's 2025 recap shows it with a tagline, heading, line of text and an "All events" button, and no editions listed (the CMS links none for 2025).
- Every past event page shows it, between the sponsors and "Mark your calendar". Its text comes from four page-copy slots (`editions.*`).
- The editions in `previous_editions` show as compact `EventCard`s, newest first. The button goes to `/events-and-campaigns`, where live's `/all-events` redirects.
- It isn't an empty section in the 7.8-4 sense: the button always leads somewhere.

### D11. Asset downloads fall back to Webflow's S3 bucket
- Webflow serves each CDN file (`cdn.prod.website-files.com/<path>`) from `s3.amazonaws.com/webflow-prod-assets/<path>` too.
- `harvest.mjs` tries the CDN first and falls back to S3, storing the file under its CDN URL either way, so manifests stay stable.
- When the live home page is unreachable, the harvest keeps the existing site-chrome list instead of failing.
- Its cleanup now removes only files it downloaded (listed in a manifest). Before, it removed every file in `public/images/pages` that the snapshot didn't reference, including the project-only images for Our Programs and Financials.
