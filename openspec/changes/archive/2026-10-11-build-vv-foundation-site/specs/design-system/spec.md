## Purpose

Defines the shared visual tokens (color, type, shape, spacing) that every component and page draws from, so the site matches the approved design reference instead of ad-hoc per-page styling.

## ADDED Requirements

### Requirement: Color tokens
The system SHALL expose a token set with a navy primary (`brand-navy`, used for headings, header/footer backgrounds, and dark sections), a sky-blue accent (`brand-sky`, used for primary buttons, links, and highlighted numerals), and three pastel tones (`pastel-yellow`, `pastel-pink`, `pastel-blue`) used consistently to color-code the nutrition/medical/education program set and other three-up card groups.

#### Scenario: Program cards use the pastel triad
- **WHEN** three related cards are rendered as a set (e.g. the three program cards, or the three "steps to change" cards)
- **THEN** they use `pastel-yellow`, `pastel-pink`, and `pastel-blue` backgrounds respectively, in that order

#### Scenario: Dark sections use the navy token
- **WHEN** a full-bleed "impact" or "connection" section is rendered
- **THEN** its background uses `brand-navy` and body text switches to a light/white token for contrast

### Requirement: Typography scale
The system SHALL define two font roles: a bold, rounded display face for headings and large stat numbers, and a plain sans body face for paragraph and UI text, each with a defined size scale from small (badges/eyebrows) to large (hero headings).

#### Scenario: Eyebrow labels
- **WHEN** a small uppercase label appears above a section heading (e.g. "IMPACT", "TRUST", "EVENTS & CAMPAIGNS")
- **THEN** it renders in the accent color, small size, letter-spaced, uppercase

### Requirement: Shape tokens
The system SHALL define a pill radius (fully rounded) for buttons and badges, and a large rounded radius (rounded-2xl equivalent) for cards, images, and section panels.

#### Scenario: Buttons are pills
- **WHEN** any primary, secondary, or outline button is rendered
- **THEN** its border-radius is fully rounded (pill shape), matching filled (`brand-sky` background) and outline (border only) variants

### Requirement: Spacing and layout tokens
The system SHALL define a constrained max-width content container, consistent section vertical padding, and a responsive grid step-down (4-up to 2-up to 1-up) for card grids between desktop and mobile.

#### Scenario: Card grid collapses on mobile
- **WHEN** a 4-column stat-tile or card grid is viewed at mobile width
- **THEN** it renders as a single column, preserving card order
