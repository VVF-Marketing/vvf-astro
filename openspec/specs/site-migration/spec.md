# site-migration Specification

## Purpose

Moves content, media, and URLs from the live Webflow site (victoriavenezuelafoundation.org) into this project in a repeatable, verifiable way, so the project can replace the Webflow site with no lost content or broken links.

## Requirements

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
The migration SHALL verify that every URL in the live sitemap, English and `/es`, is served by the migrated site, either directly or through the legacy redirects defined by the front-end and site-localization capabilities.

#### Scenario: Every sitemap URL resolves
- **WHEN** each English and `/es` URL from the live sitemap is requested against the migrated site
- **THEN** it returns 200 directly or a single 301 to a route that returns 200

### Requirement: Visual parity check
The project SHALL provide a check that captures desktop (1440px) and mobile (390px) screenshots of each migrated page on the live site and on the local build, side by side, so remaining design differences can be reviewed.

#### Scenario: Parity report generated
- **WHEN** the parity check runs
- **THEN** it produces, for every page in the migrated page list, a live and a local screenshot at both widths plus a pixel-difference image

### Requirement: Bilingual content extraction from Webflow
The system SHALL provide a command that reads every CMS item, in both the English (primary) and Spanish (secondary) locales, for the live site's team members, children, events, resources, FAQs, sponsors, sponsorship packages, and auction items, preferring the Webflow Data API and falling back to parsing the published HTML pages listed in the live sitemap when API credentials are absent or rejected. It SHALL also extract the copy and SEO metadata of every static page in both locales. Extracted data SHALL be written to a local snapshot before any transformation, with child data kept out of version control in every locale.

#### Scenario: API credentials available
- **WHEN** the extraction command runs with a valid Webflow API token and site ID configured
- **THEN** it reads only published (non-draft, non-archived) items through the Data API, for each locale, and writes one snapshot file per collection

#### Scenario: API credentials missing or unauthorized
- **WHEN** the token is absent or the API responds 401/403
- **THEN** the command logs which source it fell back to and extracts the same collections by crawling the sitemap's English and `/es` URLs

#### Scenario: Spanish locale included
- **WHEN** extraction runs
- **THEN** the snapshot contains the Spanish variant of every item and static page that has one on the live site, linked to its English counterpart

#### Scenario: Spanish child data private
- **WHEN** Spanish child variants are extracted
- **THEN** they are written only to gitignored snapshot files, like the English ones

### Requirement: Static copy seeded from the live site
The migration SHALL seed each static page's copy slots and SEO fields with the live site's English and Spanish values, mapped onto the slot keys declared by the pages.

#### Scenario: Spanish hero seeded
- **WHEN** the seed is applied after migration
- **THEN** `/es` renders the live Spanish home page hero heading from its copy slot

#### Scenario: Unmapped live copy reported
- **WHEN** live page text has no matching declared slot
- **THEN** the migration report lists the page and text so a slot can be declared or the text deliberately dropped
