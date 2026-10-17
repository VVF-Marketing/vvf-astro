# static-page-sync Specification

## Purpose

Keeps EmDash's admin dashboard showing every static, non-collection-backed page in the site automatically, so staff can see the full page inventory without reading the codebase or manually registering each page.

## Requirements

### Requirement: Static route discovery
The system SHALL identify every static route under `src/pages` that is not backed by an existing EmDash collection (i.e. excluding `[slug].astro` detail routes and their corresponding index/listing routes for `events`, `posts`, `team_members`, and `children`).

#### Scenario: New static page added
- **WHEN** a developer adds a new `.astro` file under `src/pages` that is not a collection-detail or collection-index route
- **THEN** the system includes that route's path in the next sync

#### Scenario: Collection-backed route excluded
- **WHEN** the scan encounters `src/pages/blog/[slug].astro` or `src/pages/blog/index.astro`
- **THEN** the system excludes it from the static-page set, since `posts` already represents it

### Requirement: Sync to EmDash pages collection
The system SHALL upsert one row per discovered static route per locale into an EmDash `pages` collection, keyed by route path and locale, using `EmDashClient` authenticated with a service PAT.

#### Scenario: First sync creates rows
- **WHEN** the `pages` collection has no row for a discovered route in a locale
- **THEN** the system creates one for that locale, recording at least the route path, source file path, and a last-synced timestamp

#### Scenario: Re-sync updates existing rows
- **WHEN** a previously-synced route is discovered again with an unchanged source file
- **THEN** the system updates each locale row's last-synced timestamp without creating a duplicate

### Requirement: Automatic trigger, no manual step
The system SHALL run the sync automatically on the first incoming HTTP request after server process start, for both `astro dev` and the deployed `@astrojs/node` standalone server, without requiring a developer to run a manual command.

#### Scenario: Dev server started, first page load
- **WHEN** `astro dev` starts and a browser makes the first request to any route
- **THEN** the sync runs once for that process before or alongside serving the request

#### Scenario: Sync does not block normal requests
- **WHEN** the sync has already run for the current process
- **THEN** subsequent requests are served without re-running the sync

### Requirement: Removed pages are flagged, not deleted
The system SHALL mark a previously-synced `pages` row as stale when its source file no longer exists on disk, rather than deleting the row.

#### Scenario: Page file removed
- **WHEN** a route that was previously synced no longer has a corresponding file under `src/pages`
- **THEN** the system marks that row stale on the next sync instead of removing it

### Requirement: Routes that declare copy are inventoried
Every route that declares copy slots in code, including collection listing routes, SHALL also get a `pages` row per locale, so the page inventory covers every page whose copy or SEO editors can change.

#### Scenario: Listing page with copy
- **WHEN** `/events` declares copy slots
- **THEN** the sync creates `pages` rows for `/events` in each locale

### Requirement: Copy slot sync
The sync SHALL make each page copy collection match the copy slots its manifest declares in code. It SHALL:
- create missing slot entries for each locale (English with the declared default, Spanish empty);
- update each slot's label, section, position, format and maximum length from code;
- never overwrite a slot's value, and never publish an editor's unpublished draft;
- mark entries whose slot is no longer declared as stale rather than deleting them.

The sync SHALL NOT create, change or delete collections. When a manifest's collection doesn't exist yet, the sync SHALL skip that manifest, report it, and leave the page rendering its defaults.

#### Scenario: New slot declared
- **WHEN** a developer declares a new slot on a page and the server starts
- **THEN** after the first request, that page's copy collection has an English entry with the default value and an empty Spanish entry for it

#### Scenario: Slot limit changed
- **WHEN** a developer changes a slot's maximum length in code
- **THEN** the sync updates the entries' maximum length and leaves their values unchanged

#### Scenario: Slot removed
- **WHEN** a slot is no longer declared in code
- **THEN** its entries are marked stale and kept

#### Scenario: Slot moved on the page
- **WHEN** a developer reorders a page's slots in code
- **THEN** the slots' positions follow, without changing their values or publishing an editor's draft

#### Scenario: New page before its collection exists
- **WHEN** a developer adds a page with a new copy manifest and the server starts before the schema is applied
- **THEN** the sync reports the missing collection, creates no collection, and the page renders its declared defaults
