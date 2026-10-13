## Context

See proposal.md (Why).

- **Live:** the impact report's body is a plain `<table>` (with `<thead>` for the header row) inside `.article_body.w-richtext`. It's styled by an inline `<style>` block on the live page:
  - `.article_body table`: `width:100%; table-layout:fixed; border-collapse:separate; border-spacing:0; border:1px solid #dce4ec; border-radius:16px; overflow:hidden; background:#fff; font-size:16px; margin:0 0 27px`
  - `.article_body th, td`: `padding:12px 16px; text-align:left; vertical-align:top; border-top:1px solid #dce4ec; overflow-wrap:anywhere`
  - `.article_body thead th`: `background:#c1e7f5; border-top:0; font-weight:600`
  - `.article_body td:first-child`: `font-weight:600`
  - `.article_body table + p`: `font-size:14px; color:#7c878f`
  - below 480px: table `font-size:14px`, cells `padding:10px 8px`
- **Local:** `src/pages/resources/[slug].astro` renders `<PortableText value={resource.body}>` from `emdash/ui` inside `RichText`. EmDash renders `table` blocks with its own `Table.astro`, which has scoped styles: cell borders, a grey `th`, `tbody tr:nth-child(even)` zebra, `:hover` shading, `0.9rem` text and a `.emdash-table-wrapper` scroll div. Those beat the `[&_table]…` utilities in `RichText.astro`.
- **Editor data:** EmDash's table block can carry editor formatting:
  - `hasHeaderRow` / `isHeader` cells;
  - `colspan` / `rowspan`;
  - per-cell `textAlign`, rendered as an inline `text-align`;
  - column widths, rendered as a `<colgroup>` plus an inline `min-width` on the table.

  Normalization and recovery of malformed tables come from `@emdash-cms/admin/portable-text-table`, which the package exports.
- **Usage:** resources are the only content with tables today: 4 resources, each in English and Spanish. The privacy policy also renders through `PortableText`, but its rich slot is sanitized to text blocks (`sanitizeRich`), so it has no tables.

## Goals / Non-Goals

**Goals:**
- Every Portable Text table renders in the live style with no per-table work.
- Editor formatting (alignment, widths, merged and header cells) keeps working.
- Colours come from design tokens.

**Non-Goals:**
- Adding tables to copy slots: `sanitizeRich` keeps dropping them.
- Table variants or a style picker in the editor.
- Changing table data in the CMS.
- Styling EmDash's admin editor preview.

## Decisions

### D1. Replace EmDash's table renderer, keep its table logic
`src/components/ContentTable.astro` is passed as `components={{ type: { table: ContentTable } }}`; EmDash merges user components over its defaults. It reuses EmDash's exported helpers:
- `normalizePortableTextTable`
- `createPortableTextTableCellMarkResolver`
- `getPortableTextTableColumnWidths`
- `TABLE_CELL_MIN_WIDTH`

The cell placement and header-row logic (≈60 lines in EmDash's `Table.astro`) moves into a pure, unit-tested helper, `src/lib/contentTable.ts`. Cell text still renders through `astro-portabletext` with EmDash's mark components, so links and bold or italic text inside cells work as before. The output is semantic markup with our own class names and none of EmDash's scoped styles.

**Rejected:** wrapping EmDash's `Table.astro` and overriding its scoped CSS. Its zebra, hover and border rules are attribute-scoped and would need higher-specificity or `!important` overrides that break on any EmDash update.

### D2. Card on the wrapper, so wide tables scroll inside it
The live card styles (border, 16px radius, white background, `overflow:hidden`) sit on the `<table>`. That clips rather than scrolls a table wider than a phone, and EmDash's column widths can make tables wider (inline `min-width`). So the outer `div.content-table` carries the border, radius, background, `overflow-x:auto` and the 27px bottom margin. The `<table>` inside has no outer border and keeps `table-layout:fixed; border-collapse:separate; border-spacing:0; width:100%`. The result looks identical on desktop, and wide tables scroll inside the rounded card.

### D3. Styles in the component, colours from tokens
- **Where the styles live:** in a scoped `<style>` in `ContentTable.astro` with plain CSS. Rules like `thead th`, `td:first-child` and a 479px max-width media query are clearer as CSS than as utility classes.
- **Colours:**
  - New tokens `table-border` (`#dce4ec`) and `table-note` (`#7c878f`) in `tailwind.config.cjs`, mirrored as CSS variables in `src/index.css`.
  - The header uses the existing `sky` variable.
  - Text colour and font are inherited from `RichText` (navy, Open Sans).
- **Header and first-column cells:** `th[scope="row"]`, a header cell in the first column of a body row, gets the same semibold as `td:first-child`.

### D4. Editor overrides through the cascade
- **Alignment:** a cell's `textAlign` stays an inline `style`, which beats the stylesheet's `text-align:left`.
- **Column widths:** they stay as `<colgroup><col style="width:…">`, which `table-layout:fixed` respects.
- **Merged cells:** colspan and rowspan stay attributes.
- **Defaults:** a table without these renders with the defaults only.

### D5. Source note via the wrapper's sibling
The paragraph after a table follows `div.content-table`, not the `<table>`. So `RichText.astro` gets a prose rule `[&_.content-table+p]` with 14px text in the `table-note` colour, next to its other element rules. Its old `[&_table]`, `[&_td]` and `[&_th]` utilities are removed: they're dead code once EmDash's renderer is replaced, and would conflict with D3.

### D6. One body renderer
`src/components/PortableBody.astro` wraps `PortableText` from `emdash/ui` with the custom components. The resource detail page and the privacy policy use it, so any future Portable Text field gets the table style automatically.

## Risks / Trade-offs

- **[EmDash changes its table block shape or helpers]** → We depend only on the exported helpers, as EmDash's own renderer does, and the unit tests run on the real seed's tables. A version bump that breaks them fails CI.
- **[Ported placement logic drifts from EmDash's]** → It's small and covered by tests (colspan, rowspan, header row, row-header scope, malformed fallback).
- **[`overflow-wrap:anywhere` breaks long numbers or words mid-way in narrow columns]** → This matches the live behaviour; editors can widen columns.
- **[The note rule styles a paragraph after a table that isn't a note]** → In the current content, 4 tables are followed by a paragraph (headings aren't affected). Only one is a real note: "Large-charity costs are the published monthly rates…". The other three are ordinary body text: two in Annual Report 2023 and "God enabled expanding access…" in Impact Report 2025. The live site renders all four small and grey too, so this matches it. Whether to restructure those three is a content question for marketing, outside this change.
- **[Storybook]** → storybook-astro can't run client scripts. `ContentTable` has none (server-rendered only), so a story with seed-like table data works.

## Visual check (task 4.3)

The live and local impact reports were compared at 1440px and 390px (screenshots plus computed styles of the first table). Font, size, padding, colours, radius and widths matched. The one difference was line-height: live cells inherit a fixed 27px from `.article_body` (18px × 1.5) at every width, while ours scaled with the table's own font size (24px, or 21px on phones). `ContentTable` now sets `line-height: 27px`. The only remaining difference is the table's width (766px vs 768px), because the 1px border sits on the wrapper rather than the table (D2).

## Migration Plan

Code-only. No content or schema changes, so rollback is a revert.
