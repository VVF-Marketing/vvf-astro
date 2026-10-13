# component-library Specification

## Purpose

Reusable Astro components that compose every page, styled to match their live Webflow counterparts while consuming only design-system tokens.

## Requirements

### Requirement: Live component parity
Each project component that has a live-site counterpart SHALL match that counterpart's layout, spacing, typography, color, radius, and hover/active states at desktop and mobile widths, using design tokens only (no raw hex values or page-specific overrides). The mapping SHALL cover at least: Header ↔ `navbar`, Footer ↔ `footer_component`, Button ↔ `button` (`is-primary` and other live variants), Hero ↔ `hero_card`, EventCard ↔ `event-card_component`, TeamMemberCard ↔ `team-card_component`, ChildCard ↔ `sponsor-children_item` / `children-list_item`, PastelCard ↔ `feature-card_component`, StatTileRow ↔ `number-card_component`, LogoCarousel ↔ `logos_component`, FaqAccordion ↔ `faq-row_component`, Badge ↔ `tag_component`, Eyebrow/section heading ↔ `section-title_component`.

#### Scenario: Primary button
- **WHEN** a primary button renders
- **THEN** it has a cyan accent background and border, navy text, Nunito 18px weight 700, 12px × 24px padding, and a 100px radius, matching the live `button is-primary`

#### Scenario: No raw colors in components
- **WHEN** component source is searched for hex color literals
- **THEN** none are found outside the token definition files

#### Scenario: Stories reflect live styling
- **WHEN** a restyled component's Storybook story is viewed
- **THEN** it renders the live-matching variant(s) with migrated sample content

### Requirement: Dropdown site navigation
The header SHALL present the live navigation structure, in order: "Make a Difference" dropdown (Ways to Give, Sponsor a Child, Corporate Sponsorships), "Get Involved" dropdown (Events), "Our Team" link, "Resources" dropdown (All Resources, Stories, Financials & Transparency), plus Donate and Contact Us calls to action. Dropdowns SHALL open on hover and keyboard focus on desktop and collapse into an accessible mobile menu. The EN/ES language switch SHALL NOT be rendered while Spanish is out of scope.

#### Scenario: Keyboard navigation
- **WHEN** a keyboard user tabs to "Resources" and presses Enter or Down Arrow
- **THEN** the submenu opens, focus moves into it, and Escape closes it and returns focus to the toggle

#### Scenario: Mobile menu
- **WHEN** the header renders below the live site's mobile breakpoint
- **THEN** links collapse behind a menu button that exposes `aria-expanded`

### Requirement: Breadcrumbs
The system SHALL provide a breadcrumb component matching the live `crumbs` styling, rendered as an ordered list inside a labeled `nav`, with the current page marked `aria-current="page"`.

#### Scenario: Child detail breadcrumb
- **WHEN** a child detail page renders
- **THEN** breadcrumbs show "Sponsor a Child" (linked) followed by the child's display name (current)

### Requirement: Appeal card triad
The system SHALL provide an appeal-card group matching live `appeal_cards`: a label plus a row of three cards in sun, sky, and salmon pastels, each with a title and text.

#### Scenario: Triad colors in order
- **WHEN** an appeal-card group renders three cards
- **THEN** their backgrounds are sun, sky, and salmon, in that order (as on the live site)

### Requirement: Article card
The system SHALL provide an article card matching live `article-card_component` for resources: image, category tag, title, date, and link to the resource detail page.

#### Scenario: Resource listing card
- **WHEN** a resource appears in a listing
- **THEN** its card shows its category tag and links to `/resources/<slug>`

### Requirement: Bio card
The system SHALL provide a bio card matching live `bio_card`: photo, name, role, and a list of labeled detail items (e.g. Since, From, Based in), with the long bio below.

#### Scenario: Missing detail item
- **WHEN** a team member has no "Based in" value
- **THEN** that detail item is omitted rather than rendered empty

### Requirement: Programs CTA card
The system SHALL provide a call-to-action card matching live `programs-cta_card` with heading, text, and one or two buttons.

#### Scenario: CTA with two actions
- **WHEN** the card is given primary and secondary actions
- **THEN** both render as buttons using the live primary and secondary variants

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
