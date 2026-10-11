## Purpose

Defines how links to other websites behave on every page of the site, whoever wrote them: they open in a new tab, safely, and say so to screen-reader users.

## ADDED Requirements

### Requirement: External links open in a new tab
Every link whose destination is an `http` or `https` address on a host other than the foundation's site SHALL open in a new tab (`target="_blank"`). This SHALL apply to links written in code, written by editors in CMS content, or migrated from Webflow, on every page in every locale, without per-link work. A link that already sets a `target` SHALL keep it.

#### Scenario: Sponsor logo
- **WHEN** a visitor clicks a sponsor's logo linking to the sponsor's website
- **THEN** the sponsor's site opens in a new tab and the foundation's page stays open

#### Scenario: Link added by an editor
- **WHEN** an editor adds a link to `https://www.candid.org/...` in a resource body and publishes
- **THEN** that link opens in a new tab with no developer change

#### Scenario: Spanish pages
- **WHEN** the same external link appears on an `/es` page
- **THEN** it also opens in a new tab

### Requirement: Same-site and non-web links unchanged
Links to the site itself SHALL open in the same tab. That covers relative paths, `/es` paths, and the site's full address with or without `www`. In-page anchors, `mailto:` and `tel:` links, and the language switch SHALL behave as before.

#### Scenario: Full address of the site
- **WHEN** a link points to `https://www.victoriavenezuelafoundation.org/ways-to-give`
- **THEN** it opens in the same tab (as the localized path `/ways-to-give` or `/es/ways-to-give`)

#### Scenario: Email link
- **WHEN** a visitor clicks a `mailto:` link in the footer
- **THEN** it opens the mail client as before, with no `target` added

### Requirement: Safe new-tab links
A link opened in a new tab SHALL carry `rel="noopener"`, so the opened page can't control the foundation's page. Existing `rel` values on the link SHALL be kept. `noreferrer` SHALL NOT be added where the link didn't set it, so partners can see visits came from the foundation's site.

#### Scenario: rel added
- **WHEN** an external link has no `rel`
- **THEN** it renders with `rel="noopener"`

#### Scenario: rel kept
- **WHEN** an external link already has `rel="sponsored"`
- **THEN** it renders with `rel="sponsored noopener"`

### Requirement: Screen-reader cue for new tabs
Each link that opens in a new tab SHALL tell screen-reader users so, in the page's language, without visible change: its accessible name SHALL end with the site-wide "opens in a new tab" text (default "(opens in a new tab)"; on Spanish pages "(se abre en una pestaña nueva)"). Links named by `aria-label` SHALL get the cue appended to that label. Logo links named only by an image's `alt` text SHALL get it too. The text SHALL be a site-wide copy slot that marketing can edit.

#### Scenario: Text link
- **WHEN** a screen reader reaches the external link "Candid profile" on an English page
- **THEN** it announces "Candid profile (opens in a new tab)"

#### Scenario: Spanish page
- **WHEN** a screen reader reaches the same link on its `/es` page
- **THEN** the announcement ends with "(se abre en una pestaña nueva)"

#### Scenario: Labelled icon link
- **WHEN** a social icon link has `aria-label="Instagram"`
- **THEN** its accessible name is "Instagram (opens in a new tab)"

#### Scenario: No visual change
- **WHEN** the page is viewed
- **THEN** no new text or icon is visible next to external links
