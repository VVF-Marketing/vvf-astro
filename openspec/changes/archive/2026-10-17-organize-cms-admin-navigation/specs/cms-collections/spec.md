## MODIFIED Requirements

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
