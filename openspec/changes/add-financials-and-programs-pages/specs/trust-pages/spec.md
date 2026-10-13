## Purpose

Pages that show donors what the foundation does and how it handles their money — Financials & Transparency and Our Programs — in both locales, editable like every other page.

## ADDED Requirements

### Requirement: Financials & Transparency page
The site SHALL serve `/financials-and-transparency` and `/es/financials-and-transparency` with, in order: a hero, a "Give with Confidence" section (Candid seal, 501(c)(3) registration, links to the Candid profile and the IRS determination letter), a "Where your donation goes" section linking to the latest impact report, the annual reports list, the quarterly reports list, the board members with a link to the team page, and a contact call to action. Its copy SHALL match the live page in each locale.

#### Scenario: Live URL served directly
- **WHEN** a visitor requests `/financials-and-transparency`
- **THEN** the page responds 200 without a redirect

#### Scenario: Spanish page
- **WHEN** a visitor requests `/es/financials-and-transparency`
- **THEN** the hero heading reads as on the live Spanish page

### Requirement: Report lists from content
The annual and quarterly report lists SHALL be the financials resources of that kind, newest first, each showing its date, title, summary, a link to read it on the site and, when it has a file, a download link.

#### Scenario: New report appears
- **WHEN** an editor publishes a financials resource marked as a quarterly report
- **THEN** it appears at the top of the quarterly reports list without a code change

#### Scenario: Report without a file
- **WHEN** a listed report has no file attached
- **THEN** it shows a read link and no download link

### Requirement: Our Programs page
The site SHALL serve `/our-programs` and `/es/our-programs` with, in order: a hero, how the programs work together, the nutrition, medical care and education sections (each with a photo card and caption), the global development goals panel, testimonials, a support call to action, and three "Dig deeper" cards, laid out for every screen size.

#### Scenario: Programs sections
- **WHEN** a visitor opens `/our-programs`
- **THEN** the nutrition, medical care and education sections appear in that order, each with Support and View gallery actions

#### Scenario: Spanish fallback
- **WHEN** a visitor opens `/es/our-programs` before any Spanish copy is entered
- **THEN** the page renders with the English copy and canonicalizes to the English URL

### Requirement: Testimonials only when real
The testimonials section SHALL show published entries from the testimonials collection and SHALL NOT render when there are none.

#### Scenario: No testimonials
- **WHEN** the testimonials collection has no published entries
- **THEN** the Our Programs page shows no testimonials heading or cards

#### Scenario: Testimonial added
- **WHEN** an editor publishes a testimonial with a quote, name and role
- **THEN** it appears in the testimonials section

### Requirement: Menu placement
Both locales' menus SHALL list Our Programs and Financials & Transparency under About.

#### Scenario: About menu
- **WHEN** the English menu renders
- **THEN** About lists Our Team, Our Programs and Financials & Transparency, linking to `/our-team`, `/our-programs` and `/financials-and-transparency`
