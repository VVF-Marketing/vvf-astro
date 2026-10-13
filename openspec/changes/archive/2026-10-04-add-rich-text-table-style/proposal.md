## Why

Tables in resource bodies (4 resources, each in English and Spanish, e.g. `/resources/impact-report-2025`) look different from the live site. Live tables are white cards with a 16px radius, a light-blue header row, row dividers only and a bold first column. Locally they render with EmDash's built-in table styles instead: grey header, a border on every cell, zebra rows, hover shading and 0.9rem text.

The cause is that EmDash's Portable Text renderer draws tables with its own `Table.astro` and scoped styles. Those override our `RichText` table rules, so any table an editor adds today gets EmDash's look, not ours.

## What Changes

- **New `ContentTable` component** renders Portable Text `table` blocks in the live style. It keeps EmDash's table normalization (header row, colspan/rowspan, recovery of malformed tables). Styling follows the live `.article_body` table rules:
  - white card, `#dce4ec` 1px border, 16px radius, separated rows (border-top only);
  - 12×16px cell padding, 16px text;
  - light-blue (`sky`) header row with semibold text; first column semibold;
  - no zebra or hover shading;
  - 14px text and 10×8px padding on phones (below 480px).
- **Editor overrides win.** A cell's text alignment and column widths set in the EmDash editor are kept. The defaults apply only where the editor set nothing.
- **Wide tables scroll sideways** inside the card on small screens, instead of overflowing the page.
- **Source notes:** a paragraph directly after a table renders as a small grey note (14px, `#7c878f`), as on the live site.
- **One shared Portable Text body renderer** (resource bodies, privacy policy) passes `ContentTable` for `table` blocks. The old `RichText` table rules are replaced.
- **New design tokens** for the table border (`#dce4ec`) and the note text (`#7c878f`), copied from the live CSS.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `component-library`: adds a rich-text table component matching the live table style, with editor overrides preserved.
- `design-system`: adds the table border and note colour tokens.

## Impact

- **Code:**
  - new `src/components/ContentTable.astro` and `src/components/PortableBody.astro`
  - `src/components/RichText.astro` (remove its old table rules)
  - `src/pages/resources/[slug].astro` and `src/pages/privacy-policy/index.astro` (use `PortableBody`)
  - `tailwind.config.cjs` and `src/index.css` (tokens)
- **Content:** none. Existing tables in the CMS keep their data; only their rendering changes.
- **Dependencies:** none new. It reuses EmDash's exported table helpers (`@emdash-cms/admin/portable-text-table`).
- **Tests:** a unit test for the table layout helper, a Storybook story for the static markup (storybook-astro can't run component scripts, so the story covers the styled markup only), and an e2e check of `/resources/impact-report-2025` in both locales.
- **Docs:** `docs-site` component and styling pages; the regenerated token reference.
- **Stack:** PR 10, based on `stack/09-cms-admin-navigation`.
