## Why

The live site added a Financials & Transparency page (now in its About menu) that this project only redirects to a resource category, and marketing has designed a new Our Programs page that explains what the foundation does. Both pages are about trust and understanding — why to give and what a gift does — and both should be editable and bilingual like the rest of the site.

## What Changes

- Add `/financials-and-transparency` (both locales), mirroring the live page: hero, "Give with Confidence" (Candid seal, 501(c)(3), profile and IRS letter links), "Where your donation goes", annual and quarterly report lists from the `resources` collection, the board, and a contact call to action. The temporary redirect to the financials resource category is removed and the About menu links to the page.
- Add `/our-programs` (both locales) from the Our Programs designs (desktop content on every screen size): hero, how the programs work together, nutrition / medical care / education sections, the global development goals panel, a testimonials section, a support call to action and "Dig deeper" cards. Linked under About in both menus.
- The testimonials section reads a new `testimonials` collection and stays hidden while it's empty — the design's quotes are placeholders and aren't published.
- Both pages are composed from existing library components, with small variants where the designs need them (a captioned pastel card beside `MediaSplit` copy, a second action on `ImpactBanner`) and one new report list component. All copy is copy slots; Spanish financials copy comes from the live `/es` page.
- `resources` gains a report kind (annual / quarterly) so the report lists don't depend on titles.

## Capabilities

### New Capabilities
- `trust-pages`: the Financials & Transparency and Our Programs pages — their sections, data sources, menu placement and locale behavior.

### Modified Capabilities
- `cms-collections`: `resources` report kind; new `testimonials` collection.

## Impact

- New pages and manifests under `src/pages/financials-and-transparency/` and `src/pages/our-programs/`; new `ReportList` component; variants on `MediaSplit` and `ImpactBanner`; adapter getters for reports and testimonials.
- `seed/seed.json` (schema, menus, report kinds), `scripts/migrate` (report kind mapping, Spanish copy for the new page), `src/lib/legacyRoutes.mjs` (redirect removed).
- New images under `public/images/pages/` (programs photos from the design; live financials images).
- Tests: e2e for both pages in both locales, adapter unit tests, Storybook stories for new variants.
- Our Programs has no live Spanish source: it shows English under `/es` until marketing translates it.
