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
