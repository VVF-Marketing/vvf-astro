## 1. Tokens

- [x] 1.1 Add `table-border` (`#dce4ec`) and `table-note` (`#7c878f`) colour tokens to `tailwind.config.cjs` and as CSS variables in `src/index.css`, with a comment naming the live `.article_body` source. Regenerate the token reference (`node scripts/docs-tokens.mjs`) and verify both appear in it.

## 2. Table component

- [x] 2.1 Add `src/lib/contentTable.ts`: normalize a table block with EmDash's `normalizePortableTextTable`, place cells (colspan/rowspan), detect the header row, resolve column widths and minimum width, and fall back to raw cell text for malformed tables. Verify with `src/lib/contentTable.test.ts`, covering a seed table (impact report), a header row, colspan/rowspan placement, a row-header cell's `scope`, column widths, and a malformed table.
- [x] 2.2 Add `src/components/ContentTable.astro` (D1–D4): `div.content-table` card wrapper with horizontal scroll, `<table>` with optional `<colgroup>`, `<thead>` for the header row, and cells rendered through `astro-portabletext` with EmDash's mark components. Cell `text-align`, colspan and rowspan stay inline or attributes. A scoped `<style>` holds the live rules and the 479px phone rule, with colours from the token variables. Verify `astro build` passes and the impact report renders its 5 tables with `thead` and no EmDash table classes.
- [x] 2.3 Add `src/components/PortableBody.astro` (D6), wrapping `PortableText` from `emdash/ui` with `components={{ type: { table: ContentTable } }}`. Use it in `src/pages/resources/[slug].astro` and `src/pages/privacy-policy/index.astro`. Verify both pages render as before apart from the tables: run the copy lint test and the existing resources and privacy e2e.

## 3. Rich text rules

- [x] 3.1 In `src/components/RichText.astro`, remove the old `[&_table]`, `[&_td]` and `[&_th]` utilities and add the source-note rule `[&_.content-table+p]` (14px, `table-note` colour) (D5). Verify in a browser that the note after the table on `/resources/how-to-sponsor-a-child-directly` renders small and grey, and that headings after tables are unchanged.

## 4. Stories and tests

- [x] 4.1 Add `src/components/ContentTable.stories.ts` with a default table (header row, 3 body rows, like the impact report), a right-aligned numbers column, and a wide 8-column table. Verify `npm run test:storybook` passes.
- [x] 4.2 Add an e2e check in `e2e/resources.spec.ts`. On `/resources/impact-report-2025` and `/es/resources/impact-report-2025`, the first table must have a sky header (`rgb(193, 231, 245)`), a 16px card radius, no zebra background on the second body row, a semibold first column, and no `.emdash-table`. At 390px wide, the page must have no horizontal scroll. Verify the spec passes against the built site.
- [x] 4.3 Visual check against the live page: compare a screenshot of the local impact report's tables with the live site at 1440px and 390px. Note any remaining differences in this change's design.md.

## 5. Docs and wrap-up

- [x] 5.1 Document `ContentTable` and `PortableBody` in `docs-site/src/content/docs/components.md`: what renders tables, which editor formatting is kept, and the source-note rule. Add the two tokens to `styling.md`. Verify the docs build passes.
- [x] 5.2 Run the unit tests, Storybook tests and e2e against the built site, then report the results.
