## Purpose

Serves the site in US English by default and in Venezuelan Spanish under `/es`, with predictable fallback when a translation is missing and correct language signals for browsers and search engines.

## ADDED Requirements

### Requirement: Locale routing
The site SHALL serve en-US content at unprefixed paths and es-VE content at the same paths prefixed with `/es`. Every public page available in English SHALL also be reachable under `/es`.

#### Scenario: English default
- **WHEN** a visitor requests `/ways-to-give`
- **THEN** the page renders in English with `<html lang="en-US">`

#### Scenario: Spanish prefix
- **WHEN** a visitor requests `/es/ways-to-give`
- **THEN** the page renders with Spanish copy and `<html lang="es-VE">`

#### Scenario: No English prefix
- **WHEN** a visitor requests `/en/ways-to-give`
- **THEN** the site does not serve a duplicate English page at that path

### Requirement: Translation fallback
When content for the requested locale is missing, the site SHALL fall back to English; when English content is also missing, it SHALL respond 404.

#### Scenario: Spanish CMS item missing
- **WHEN** `/es/events/<slug>` is requested and the event has no Spanish version but has an English one
- **THEN** the page renders with the English event content and responds 200

#### Scenario: Item missing in both locales
- **WHEN** `/es/events/<slug>` is requested and no event with that slug exists in either locale
- **THEN** the site responds 404

#### Scenario: English item taken down
- **WHEN** an item's English version is unpublished or hidden (for a child profile, its `published` flag turned off) while its Spanish version is still published
- **THEN** the item is hidden under `/es` as well: it is left out of Spanish lists and its `/es` detail URL responds 404

#### Scenario: Spanish copy slot missing
- **WHEN** a Spanish static page renders and one of its copy slots has no Spanish value
- **THEN** that slot shows its English value and the rest of the page shows Spanish

### Requirement: Language signals for search engines
Each page SHALL output a canonical URL and `hreflang` alternates (`en-US`, `es-VE`, `x-default` pointing at English) only for locales in which the page has its own content. A static page has its own Spanish content once its Spanish SEO title is filled in; other copy slots may still fall back to English. A page served entirely from English fallback under `/es` SHALL set its canonical URL to the English URL.

#### Scenario: Fully translated page
- **WHEN** a page has both English and Spanish content
- **THEN** both locale URLs list each other as `hreflang` alternates and each is its own canonical

#### Scenario: Fallback page
- **WHEN** `/es/events/<slug>` renders English fallback content
- **THEN** its canonical URL is the English event URL and no `es-VE` alternate is emitted for it

### Requirement: Locale switching
Every page SHALL offer a language switch, shown as "EN / ES", that links to the same page in the other locale and marks the current one. One shared component SHALL render it in three places: the desktop header (between the menu and the buttons), the first line of the open phone menu, and the footer's bottom row next to the privacy policy link (smaller). It SHALL never switch language on its own based on the visitor's browser.

#### Scenario: Switch to Spanish
- **WHEN** a visitor on `/our-team/<slug>` uses the language switch
- **THEN** they land on the Spanish URL of the same team member (using the Spanish slug when one exists)

#### Scenario: Switch in header, phone menu and footer
- **WHEN** any page renders
- **THEN** the switch appears in the header, as the first line of the phone menu, and in the footer, each marking the current language

#### Scenario: Spanish header fits
- **WHEN** a Spanish page renders at any width from 992px up
- **THEN** the header's menu, language switch and buttons don't overlap

### Requirement: Localized navigation and legacy URLs
Navigation menus SHALL render per locale, linking to routes in the current locale. Every live Webflow `/es/...` URL SHALL resolve on the migrated site, directly or through a single permanent redirect, including Spanish equivalents of the legacy redirects defined by the front-end capability.

#### Scenario: Spanish legacy redirect
- **WHEN** a visitor requests `/es/team-members/<slug>`
- **THEN** the site responds with a single 301 to the Spanish team member route, which returns 200

#### Scenario: Spanish menu
- **WHEN** a Spanish page renders the primary navigation
- **THEN** menu labels are in Spanish and every link points to an `/es` route

### Requirement: Same-site links follow the page language
Every link from a page to another page of the site SHALL point to that page in the language of the page it appears on, whether the link was written as a path, as a full address of the site, or with the other language's prefix. The language switch is the only exception.

#### Scenario: Full address on a Spanish page
- **WHEN** content on `/es/resources/<slug>` links to `https://victoriavenezuelafoundation.org/ways-to-give`
- **THEN** the rendered link points to `/es/ways-to-give`

#### Scenario: Spanish path on an English page
- **WHEN** content on an English page links to `/es/ways-to-give`
- **THEN** the rendered link points to `/ways-to-give`

#### Scenario: Language switch kept
- **WHEN** a Spanish page renders the language switch
- **THEN** its English link still points to the English page

