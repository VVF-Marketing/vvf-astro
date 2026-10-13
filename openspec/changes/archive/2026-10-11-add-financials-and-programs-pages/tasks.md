## 1. Content model

- [x] 1.1 Add `report_kind` (annual / quarterly) to `resources` and a `testimonials` collection (quote, name, role, photo; drafts + revisions) to the seed, map report kinds in the migration, add adapter getters `getReports(kind, locale)` and `getTestimonials(locale)`; verify unit tests and that the seed applies to an empty database

## 2. Components

- [x] 2.1 Add a `ReportList` component (date, title, summary, Read, optional Download) with a Storybook story; verify the Storybook suite passes
- [x] 2.2 Add `MediaSplit`'s captioned pastel-card option and `ImpactBanner`'s optional second action, defaulting to today's rendering; verify existing pages' text snapshots are unchanged and stories pass

## 3. Financials & Transparency

- [x] 3.1 Harvest the live page's images and build `/financials-and-transparency` from the mapped components with all copy in `_copy.ts` (live English as defaults), remove the temporary redirect, and point the About menu at the page in both locales; verify an e2e check of its sections and report lists
- [x] 3.2 Translate its copy from the live `/es` page with the copy step and import it; verify `/es/financials-and-transparency` shows the live Spanish hero

## 4. Our Programs

- [x] 4.1 Add the design photos as WebP and build `/our-programs` from the mapped components with all copy in `_copy.ts`, the testimonials section reading the collection (hidden when empty), and About → Our Programs in both menus; verify an e2e check of its sections at desktop and phone widths, that no testimonials render while the collection is empty, and the Spanish fallback

## 5. Wrap-up

- [x] 5.1 Run unit, Storybook, menu, copy lint, link and e2e checks, and update the docs (pages list, testimonials); verify all pass and the docs build
