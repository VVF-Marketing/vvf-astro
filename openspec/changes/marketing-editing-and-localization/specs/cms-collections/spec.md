## ADDED Requirements

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
The system SHALL define a `page_copy` collection with one entry per copy slot per locale, holding the page route (or a site-wide marker), the slot key, a human-readable label, the format (plain, rich or image), the maximum length, and the value. Per-page SEO (title, meta description, share image) SHALL be stored as copy slots of that page. The route, key, label, format and maximum length SHALL be identical across a slot's locales; only the value is translated.

#### Scenario: Site-wide slot
- **WHEN** the footer newsletter heading is looked up
- **THEN** it is found as a site-wide `page_copy` entry, not tied to one route

#### Scenario: Page SEO stored per locale
- **WHEN** the `/contact` page has English and Spanish meta descriptions
- **THEN** each is stored as the value of that page's description slot in its own locale

### Requirement: Drafts and revisions on editable collections
Every collection editors can change (all content collections and `page_copy`) SHALL keep unpublished drafts separate from live content and SHALL keep a revision history of published changes. The sync-owned `pages` inventory SHALL NOT.

#### Scenario: Draft not live
- **WHEN** an editor saves a change to an event without publishing it
- **THEN** the public event page keeps showing the published version

#### Scenario: Revision restore
- **WHEN** an editor restores an earlier revision of a FAQ and publishes it
- **THEN** the public site shows the earlier text

### Requirement: Event appeal and contact fields
The `events` collection SHALL include an optional appeal section (heading, text, image, caption, cards label, cards with title, text and image, and a call to action) and optional contact details (phone, email, address), so content specific to one event isn't written into the shared event page template.

#### Scenario: Event with an appeal
- **WHEN** an upcoming event has an appeal heading and cards
- **THEN** its page shows the appeal section with that content

#### Scenario: Event without an appeal
- **WHEN** an upcoming event has no appeal heading
- **THEN** its page shows no appeal section

## MODIFIED Requirements

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
