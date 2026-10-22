## ADDED Requirements

### Requirement: Event content kept through extraction
Extraction and seed generation SHALL keep, in both languages:
- each recap stat's caption;
- an offer's included text when it is a paragraph rather than a list;
- the photos and alt text of an upcoming event page's memories section;
- the event's long description from the Webflow CMS.

The long description is not on the page, so it comes from the Webflow API when credentials are configured. Otherwise the value already in the snapshot is kept, never dropped.

#### Scenario: Re-scrape without a token
- **WHEN** `npm run migrate:extract` runs with no Webflow API token
- **THEN** each event's long description already in the snapshot is kept

#### Scenario: Paragraph offer text
- **WHEN** an offer's included text on the live page is a paragraph
- **THEN** the snapshot and the seed keep that paragraph for the offer

### Requirement: Drift check
`npm run migrate:drift` SHALL compare the snapshot with the build's content (seed, copy defaults and page sources). It SHALL list, per page, every visible text, alt text and SEO string from the snapshot that the build doesn't contain, ignoring differences in quotes, dashes and whitespace. It SHALL exit 0, since it is a report, not a gate.

#### Scenario: Missing heading reported
- **WHEN** a live heading exists in the snapshot but nowhere in the build
- **THEN** the drift report lists it under its page path
