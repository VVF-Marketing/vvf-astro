## MODIFIED Requirements

### Requirement: Sync to EmDash pages collection
The system SHALL upsert one row per discovered static route per locale into an EmDash `pages` collection, keyed by route path and locale, using `EmDashClient` authenticated with a service PAT.

#### Scenario: First sync creates rows
- **WHEN** the `pages` collection has no row for a discovered route in a locale
- **THEN** the system creates one for that locale, recording at least the route path, source file path, and a last-synced timestamp

#### Scenario: Re-sync updates existing rows
- **WHEN** a previously-synced route is discovered again with an unchanged source file
- **THEN** the system updates each locale row's last-synced timestamp without creating a duplicate

## ADDED Requirements

### Requirement: Routes that declare copy are inventoried
Every route that declares copy slots in code, including collection listing routes, SHALL also get a `pages` row per locale, so the page inventory covers every page whose copy or SEO editors can change.

#### Scenario: Listing page with copy
- **WHEN** `/events` declares copy slots
- **THEN** the sync creates `pages` rows for `/events` in each locale

### Requirement: Copy slot sync
The sync SHALL make the `page_copy` collection match the copy slots declared in code: it SHALL create missing slot entries for each locale (English with the declared default, Spanish empty), update each slot's label, format and maximum length from code, never overwrite a slot's value, never publish an editor's unpublished draft, and mark entries whose slot is no longer declared as stale rather than deleting them.

#### Scenario: New slot declared
- **WHEN** a developer declares a new slot on a page and the server starts
- **THEN** after the first request, `page_copy` has an English entry with the default value and an empty Spanish entry for it

#### Scenario: Slot limit changed
- **WHEN** a developer changes a slot's maximum length in code
- **THEN** the sync updates the entries' maximum length and leaves their values unchanged

#### Scenario: Slot removed
- **WHEN** a slot is no longer declared in code
- **THEN** its entries are marked stale and kept
