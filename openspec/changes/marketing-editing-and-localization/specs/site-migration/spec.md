## MODIFIED Requirements

### Requirement: Sitemap URL coverage
The migration SHALL verify that every URL in the live sitemap, English and `/es`, is served by the migrated site, either directly or through the legacy redirects defined by the front-end and site-localization capabilities.

#### Scenario: Every sitemap URL resolves
- **WHEN** each English and `/es` URL from the live sitemap is requested against the migrated site
- **THEN** it returns 200 directly or a single 301 to a route that returns 200

## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Content extraction from Webflow
**Reason**: Extraction was English-only and explicitly excluded `/es` pages and Spanish CMS variants; the site now serves es-VE as well.
**Migration**: Replaced by "Bilingual content extraction from Webflow", which keeps the same sources and fallback behavior and adds the Spanish locale and static page copy.
