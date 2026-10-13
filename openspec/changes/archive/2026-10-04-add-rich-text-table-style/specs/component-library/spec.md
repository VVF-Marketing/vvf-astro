## ADDED Requirements

### Requirement: Rich-text tables
Tables in CMS rich text (Portable Text `table` blocks, e.g. resource bodies) SHALL render in the live site's `.article_body` table style by default:
- a white card with a 1px table-border outline and 16px radius, full width with fixed column layout;
- rows separated by a 1px top border only, with no zebra or hover shading;
- cells padded 12px × 16px, top-aligned and left-aligned, 16px text, with long words wrapping;
- a header row in the sky colour with semibold text;
- the first column semibold.

Below 480px wide, table text SHALL be 14px and cells padded 10px × 8px. A paragraph directly after a table SHALL render as a source note in 14px table-note text.

Formatting set on a table in the CMS editor SHALL take precedence over these defaults: a cell's text alignment, column widths, merged cells (colspan/rowspan), and header cells. A table wider than the screen SHALL scroll horizontally inside its card rather than widen the page. A malformed table SHALL still render its cell text.

#### Scenario: Default table matches the live site
- **WHEN** `/resources/impact-report-2025` is viewed
- **THEN** its tables have a sky header row, a rounded white card with a light border, dividers between rows only, and a semibold first column, with no striped or hover-shaded rows

#### Scenario: Spanish page uses the same style
- **WHEN** `/es/resources/impact-report-2025` is viewed
- **THEN** its tables render in the same style

#### Scenario: Editor alignment kept
- **WHEN** an editor right-aligns a column of numbers in a table and publishes
- **THEN** those cells render right-aligned, and the rest of the table keeps the default style

#### Scenario: Editor column widths kept
- **WHEN** an editor resizes a table's columns in the editor
- **THEN** the rendered columns use those widths

#### Scenario: Source note after a table
- **WHEN** a table is followed directly by a paragraph such as "Large-charity costs are the published monthly rates of…"
- **THEN** that paragraph renders smaller and grey, as a note to the table

#### Scenario: Wide table on a phone
- **WHEN** a table with many columns is viewed on a 390px-wide screen
- **THEN** the table scrolls sideways within its card and the page itself doesn't scroll horizontally

#### Scenario: Any new table gets the style
- **WHEN** an editor adds a new table to a resource body without setting alignment or widths
- **THEN** it renders in the default style with no developer change
