## Purpose

Defines the Sanity content schemas that back every dynamic list and detail page on the site, so editors can manage events, children, team, and blog content without code changes.

## ADDED Requirements

### Requirement: Events collection
The system SHALL define an `event` document type with: title, slug, start date, location, description, hero image, category (e.g. golf-tournament, community, awareness), a computed/derived "upcoming" vs "past" status based on date, and optional Donorbox event/ticket reference and sponsor-package reference list.

#### Scenario: Past events omit ticketing fields from the rendered card
- **WHEN** an event's date is in the past
- **THEN** the front end renders it in the "past" archive list without ticket/register CTAs, regardless of whether a Donorbox reference is still set on the document

### Requirement: Sponsored children collection
The system SHALL define a `child` document type with: name, age, birthday, gender, a "dream" quote, photo, and a Donorbox sponsorship reference; age SHALL support the site's age-range filter (0-2, 3-5, 6-8, 9-11, 12-14, 15+).

#### Scenario: Child filters by age range
- **WHEN** a visitor selects the "9 - 11" age filter on the children grid
- **THEN** only children whose age falls in that inclusive range are shown

### Requirement: Team members collection
The system SHALL define a `teamMember` document type with: name, role/title, tier (`board`, `leader`, or `staff`), photo, short bio, optional long-form bio (for detail pages), optional "since"/"from"/"based in" metadata, optional background facts (executive role, education, board service), and social links; the Board of Directors, Leadership, and Staff sections on the Our Team page SHALL each query by tier.

#### Scenario: Only board and leader tiers get a detail page
- **WHEN** a `teamMember` document has tier `staff`
- **THEN** no individual detail route is generated for them; they appear only as a card in the team grid

#### Scenario: Team content reflects the current roster
- **WHEN** the Our Team page is built
- **THEN** it is populated from the "V2 Proposed" roster (Board: Randy Lander, Helen Bello, Pastor Jose Guerrero; Leadership adds Charmiant Corado, Juan Tomasini, Enrique Flores; Staff: the full named list), not the earlier placeholder roster with duplicated names/bios

### Requirement: Blog posts collection
The system SHALL define a `post` document type with: title, slug, author, published/updated date, category (Stories, Events, Financials, News), excerpt, hero image, and rich-text body; the blog listing SHALL support filtering by category via the same set of categories.

#### Scenario: Featured posts sidebar
- **WHEN** the blog index or an article page renders the "Featured" sidebar
- **THEN** it shows posts flagged as featured, independent of the currently selected category filter

### Requirement: Sponsors and partners collection
The system SHALL define a `sponsor` document type (name, logo, tier reference) used to populate the corporate-logo carousel and, where applicable, a "thank you to our sponsors" section on event detail pages.

#### Scenario: Event page shows only that event's sponsors
- **WHEN** an event detail page renders its sponsor logos
- **THEN** it shows sponsors linked to that specific event, not the site-wide sponsor list

### Requirement: Sponsorship packages collection
The system SHALL define a `sponsorshipPackage` document type (tier name, price, recognition benefits list, activity benefits list, promotional-item benefits list) used by both the Corporate Sponsorships page and event-specific sponsor-tier tables.

#### Scenario: Event-specific package overrides the default set
- **WHEN** an event defines its own sponsor packages
- **THEN** the event detail page's comparison table uses those instead of the site-wide Corporate Sponsorships packages

### Requirement: Silent auction items collection
The system SHALL define an `auctionItem` document type (name, image, estimated value, bid/donate link) used on event detail pages that include a silent auction section.

#### Scenario: Event without an auction omits the section
- **WHEN** an event has zero linked auction items
- **THEN** the event detail page does not render an empty "Silent Auction" section

### Requirement: FAQs collection
The system SHALL define an `faq` document type (question, answer, category e.g. sponsorship/donation/tournament) so the same accordion component can be reused across Sponsor a Child, Ways to Give, Contact, and event pages with a page-appropriate subset.

#### Scenario: FAQ set is scoped per page
- **WHEN** the Ways to Give page renders its FAQ accordion
- **THEN** it shows only FAQs tagged for that page's category, not the full FAQ collection

### Requirement: Earthquake relief updates collection
The system SHALL define a `campaignUpdate` document type (title, date, image/video, body) used by the Earthquake Relief page's "Latest updates" feed, and a way to mark the campaign itself active/inactive to control whether the site-wide announcement banner shows.

#### Scenario: Inactive campaign hides the banner
- **WHEN** the earthquake-relief campaign is marked inactive
- **THEN** the site-wide announcement banner no longer renders, even though the campaign page itself remains reachable
