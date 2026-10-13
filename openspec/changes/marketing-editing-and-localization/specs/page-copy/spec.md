## Purpose

Makes the text and SEO metadata of static pages editable in the CMS, per locale, while keeping page structure, styling, links and behavior under developer control.

## ADDED Requirements

### Requirement: Developer-declared copy slots
Every piece of visible text on a static page, the fixed text of each collection detail template (e.g. section headings on every event page), and every shared piece of interface text (buttons, navigation labels, footer, form labels and messages) SHALL come from a copy slot declared by developers in code. Each slot SHALL have a stable key, a human-readable label, a format (plain or rich text), a maximum length, and an English default.

#### Scenario: Slot rendered from CMS
- **WHEN** an editor changes the published English value of the home page's hero heading slot
- **THEN** the next request to `/` shows the new heading without a rebuild or deploy

#### Scenario: Undeclared copy not rendered
- **WHEN** a copy entry exists in the CMS for a key the page does not declare
- **THEN** the page does not render it

#### Scenario: Template copy shared by every item
- **WHEN** an editor changes the "Tickets" heading slot of the event template
- **THEN** every event page shows the new heading

#### Scenario: No hardcoded page copy
- **WHEN** the page sources are inspected
- **THEN** visible copy is read from slots rather than written as literal text in the page markup

### Requirement: Slot defaults
When a slot has no value in the requested locale or in English, the page SHALL render the slot's English default from code.

#### Scenario: Empty slot
- **WHEN** a newly declared slot has no CMS value in any locale
- **THEN** the page renders the slot's English default

### Requirement: Copy edits cannot change structure, style or behavior
Copy slot values SHALL be treated as content only: plain slots SHALL render as escaped text, rich slots SHALL accept only the formatting the rendering component supports, and link targets, images, layout, sections and CSS classes of static pages SHALL NOT be editable through copy slots.

#### Scenario: Markup in plain slot
- **WHEN** a plain slot's value contains `<script>` or HTML tags
- **THEN** the page shows the characters as text and no markup is injected

#### Scenario: Over-length value
- **WHEN** an edit sets a slot value longer than its maximum length
- **THEN** the edit is rejected with a message naming the slot and its limit

### Requirement: Per-page SEO metadata in the CMS
Each static page SHALL take its title, meta description and social share image per locale from the CMS, falling back to the English values, then to the site defaults. Edits SHALL be limited to 60 characters for titles and 160 characters for descriptions; values carried over from the live site that exceed these limits SHALL be kept as they are until someone edits them.

#### Scenario: SEO edit goes live
- **WHEN** an editor publishes a new Spanish meta description for `/es/contact`
- **THEN** the next request to `/es/contact` outputs that description in its meta tags

#### Scenario: SEO fallback
- **WHEN** `/es/privacy-policy` has no Spanish SEO title
- **THEN** it outputs the English SEO title

#### Scenario: Over-long SEO edit rejected
- **WHEN** an editor saves a 70-character SEO title
- **THEN** the edit is rejected with a message naming the 60-character limit

#### Scenario: Existing over-long value kept
- **WHEN** the migrated home page title is 69 characters and nobody has edited it
- **THEN** the page keeps outputting it unchanged

#### Scenario: Existing SEO preserved
- **WHEN** the change ships
- **THEN** every static English page outputs the same title, description and share image it output before
