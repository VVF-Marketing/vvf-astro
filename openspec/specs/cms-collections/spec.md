# cms-collections Specification

## Purpose

EmDash collections backing every dynamic list and detail page, populated with the live site's published content so editors manage real data after cutover.

## Requirements

### Requirement: Resources collection
The system SHALL define a `resources` collection with: title, slug, category (`stories`, `financials-transparency`, plus any further live category), published date, last-updated date, authors (name and role), excerpt, hero image, rich-text body, optional downloadable file (PDF), and SEO title, meta description, and social image.

#### Scenario: Resource with download
- **WHEN** a resource has a file attached (e.g. Impact Report 2025 PDF)
- **THEN** the resource detail page offers a download link to the locally hosted file

#### Scenario: Category listing
- **WHEN** resources are queried by category `financials-transparency`
- **THEN** only resources in that category are returned, newest first

### Requirement: Child about field
The `children` collection SHALL include an optional `about` text field holding the "About <name>" paragraph shown on the live child page.

#### Scenario: About section shown
- **WHEN** a child has an `about` value
- **THEN** the child detail page renders it under an "About <display name>" heading

#### Scenario: About section absent
- **WHEN** a child has no `about` value
- **THEN** no empty "About" heading is rendered

### Requirement: Collections populated from live content
After migration, the team members, children, events (with their sponsorship packages, auction items, and sponsors), FAQs, and resources collections SHALL contain every item published on the live site in both English and Spanish, with matching slugs, text, and images per locale, replacing the placeholder seed data.

#### Scenario: Children count
- **WHEN** the children listing renders after seeding
- **THEN** it lists the same set of children as the live `/sponsor-a-child-list-page`

#### Scenario: Placeholder content removed
- **WHEN** the seed is regenerated from the snapshot
- **THEN** no placeholder entries from the previous seed remain in collections that exist on the live site

#### Scenario: Spanish items present
- **WHEN** a collection item has a published Spanish variant on the live site
- **THEN** the seeded collection has a Spanish entry linked to its English entry, with the live Spanish slug and text

### Requirement: Report kind on resources
The `resources` collection SHALL include an optional report kind (`annual` or `quarterly`) identifying financial reports for the Financials & Transparency page.

#### Scenario: Migrated reports classified
- **WHEN** the seed is generated from the live snapshot
- **THEN** each annual or impact report is marked `annual` and each "Your Impact" update is marked `quarterly`

### Requirement: Testimonials collection
The system SHALL define a `testimonials` collection with a quote, the person's name and role, and an optional photo, with drafts and revisions like the other editable collections.

#### Scenario: Empty by default
- **WHEN** the seed is applied
- **THEN** the testimonials collection exists and has no entries

### Requirement: Locale-aware collections
Every content collection SHALL store entries per locale (`en` and `es`), with translations of the same entry linked together and slugs unique within a locale.

#### Scenario: Linked translations
- **WHEN** an event has English and Spanish versions
- **THEN** each version can be retrieved from the other as its translation

#### Scenario: Same slug in two locales
- **WHEN** an English and a Spanish entry share the slug `impact-report-2025`
- **THEN** both are stored without a conflict

#### Scenario: Locale query
- **WHEN** resources in category `stories` are queried for locale `es`
- **THEN** only Spanish entries are returned, with English entries used for any resource that has no Spanish version

### Requirement: Page copy collection
The system SHALL define one page copy collection per copy manifest: one for each static page that declares copy, one for each collection detail template, and one for site-wide text. Each SHALL hold one entry per copy slot per locale, with the slot key, a human-readable label, its section (SEO or Content), its position on the page, the format (plain, rich or image), the maximum length, and the value. Per-page SEO (title, meta description, share image) SHALL be stored as copy slots of that page's collection. The key, label, section, position, format and maximum length SHALL be identical across a slot's locales; only the value is translated. No single collection SHALL hold the copy of more than one manifest.

#### Scenario: Site-wide slot
- **WHEN** the footer newsletter heading is looked up
- **THEN** it is found in the site-wide text collection, not in any page's collection

#### Scenario: Page SEO stored per locale
- **WHEN** the `/contact` page has English and Spanish meta descriptions
- **THEN** each is stored as the value of the description slot in the Contact copy collection, in its own locale

#### Scenario: Pages kept apart
- **WHEN** the Home and Ways to Give pages both declare a "Hero heading" slot
- **THEN** each is stored in its own page's collection and editing one doesn't affect the other

### Requirement: Drafts and revisions on editable collections
Every collection editors can change (all content collections and every page copy collection) SHALL keep unpublished drafts separate from live content and SHALL keep a revision history of published changes. The sync-owned `pages` inventory SHALL NOT.

#### Scenario: Draft not live
- **WHEN** an editor saves a change to an event without publishing it
- **THEN** the public event page keeps showing the published version

#### Scenario: Revision restore
- **WHEN** an editor restores an earlier revision of a FAQ and publishes it
- **THEN** the public site shows the earlier text

#### Scenario: Draft copy not live
- **WHEN** an editor saves a new Home hero heading without publishing it
- **THEN** `/` keeps showing the published heading

### Requirement: Event appeal and contact fields
The `events` collection SHALL include an optional appeal section (heading, text, image, caption, cards label, cards with title, text and image, and a call to action) and optional contact details (phone, email, address), so content specific to one event isn't written into the shared event page template.

#### Scenario: Event with an appeal
- **WHEN** an upcoming event has an appeal heading and cards
- **THEN** its page shows the appeal section with that content

#### Scenario: Event without an appeal
- **WHEN** an upcoming event has no appeal heading
- **THEN** its page shows no appeal section
