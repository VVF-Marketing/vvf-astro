## ADDED Requirements

### Requirement: Badge for small labels
Small grey labels (event dates, resource categories and report dates) SHALL use the site's badge atom: neutral light-gray `#e7e7e7` background, 4px radius, 4px × 8px padding, 14px text on a 1.5 line height, navy text, the live body font variable (Nunito), matching live `.tag_component`. Components SHALL NOT hand-roll badge styles or use hard-coded background colours for them.

#### Scenario: Report dates use the badge
- **WHEN** `/financials-and-transparency` is viewed in either locale
- **THEN** each annual and quarterly report card's date renders as the badge: `#e7e7e7` background, 4px rounded corners, Nunito 14px

#### Scenario: Report date is machine-readable
- **WHEN** a report card shows "February 3, 2026"
- **THEN** the date is marked up with a `datetime` of `2026-02-03`

#### Scenario: Same look as other badges
- **WHEN** a report date badge and an event card's date badge are compared
- **THEN** they have the same background, radius, font, size and padding

#### Scenario: No hard-coded colours
- **WHEN** the component sources are inspected
- **THEN** no badge-like label uses an arbitrary hex background utility
