# site-migration Specification

## Purpose

Moves content, media, and URLs from the live Webflow site (victoriavenezuelafoundation.org) into this project in a repeatable, verifiable way, so the project can replace the Webflow site with no lost content or broken links.

## Requirements

### Requirement: Content extraction from Webflow
The system SHALL provide a command that reads every English-locale (primary locale) CMS item for the live site's team members, children, events, resources, FAQs, sponsors, sponsorship packages, and auction items, preferring the Webflow Data API and falling back to parsing the published HTML pages listed in the live sitemap when API credentials are absent or rejected. Extracted data SHALL be written to a local, version-controlled snapshot before any transformation.

#### Scenario: API credentials available
- **WHEN** the extraction command runs with a valid Webflow API token and site ID configured
- **THEN** it reads only published (non-draft, non-archived) items through the Data API and writes one snapshot file per collection

#### Scenario: API credentials missing or unauthorized
- **WHEN** the token is absent or the API responds 401/403
- **THEN** the command logs which source it fell back to and extracts the same collections by crawling the sitemap's non-`/es` URLs

#### Scenario: Spanish locale excluded
- **WHEN** extraction runs
- **THEN** no `/es` page or secondary-locale CMS variant is included in the snapshot

### Requirement: Asset harvesting
The system SHALL download every image and document (PDF) referenced by extracted content or by the migrated pages from the Webflow CDN (`cdn.prod.website-files.com`), store site-chrome assets (logo, favicon, social share image, decorative section imagery) under `public/`, and store CMS media so EmDash serves it from its media store. Each downloaded file SHALL keep its alt text where the source provides one.

#### Scenario: No runtime dependency on the Webflow CDN
- **WHEN** the migrated site is built and served
- **THEN** no rendered page references a `website-files.com` or `webflow.com` URL

#### Scenario: Re-run is idempotent
- **WHEN** the harvesting step runs twice against unchanged source content
- **THEN** already-downloaded files are skipped and no duplicate media entries are created

#### Scenario: Broken source asset
- **WHEN** a referenced asset returns a non-2xx response
- **THEN** the run continues, and the asset is listed in a migration report with its source URL and the item that referenced it

### Requirement: Seed generation
The system SHALL transform the snapshot into the project's EmDash seed file, mapping source fields to the project's collection schemas, converting rich text to the format the project renders, and preserving each item's source slug.

#### Scenario: Slugs preserved
- **WHEN** a live team member is at `/team-members/randy-lander`
- **THEN** the seeded entry has slug `randy-lander`

#### Scenario: Unmapped source fields reported
- **WHEN** a source item has a field with no target in the project schema
- **THEN** the migration report lists the collection and field name so it can be modeled or deliberately dropped

#### Scenario: Seed loads cleanly
- **WHEN** the generated seed is applied to an empty local database
- **THEN** the apply succeeds and entry counts per collection equal the published item counts on the live site

### Requirement: Child privacy on import
The migration SHALL import only child data already shown publicly on the live site (display name, age, birthday, gender, dream, about, photo) and SHALL NOT populate the private full-name field from any source.

#### Scenario: Private name left empty
- **WHEN** children are imported
- **THEN** every seeded child has an empty `private_full_name`

### Requirement: Sitemap URL coverage
The migration SHALL verify that every English URL in the live sitemap is served by the migrated site, either directly or through the legacy redirects defined by the front-end capability.

#### Scenario: Every sitemap URL resolves
- **WHEN** each English URL from the live sitemap is requested against the migrated site
- **THEN** it returns 200 directly or a single 301 to a route that returns 200

### Requirement: Visual parity check
The project SHALL provide a check that captures desktop (1440px) and mobile (390px) screenshots of each migrated page on the live site and on the local build, side by side, so remaining design differences can be reviewed.

#### Scenario: Parity report generated
- **WHEN** the parity check runs
- **THEN** it produces, for every page in the migrated page list, a live and a local screenshot at both widths plus a pixel-difference image
