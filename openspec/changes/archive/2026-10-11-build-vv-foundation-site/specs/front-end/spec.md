## Purpose

Defines the Astro pages and routes the site exposes, and which components/CMS content each composes, so navigation and page structure match the approved design reference.

## ADDED Requirements

### Requirement: Home page
The system SHALL render a home page composed of: hero, about/impact stat-tile row, three-color program cards, dark "connection" impact banner, testimonial/stories carousel, upcoming+past events section, corporate-partner logo carousel, and a trust/transparency callout, in that order.

#### Scenario: Home links into every primary section
- **WHEN** the home page is rendered
- **THEN** each section's CTA points at the resolved nav-map target (e.g. Sponsor a Child, Ways to Give, Meet the Children, Events)

### Requirement: Our Team page and member detail
The system SHALL render an Our Team page with hero, a Board of Directors grid (tier `board`), a Leadership grid (tier `leader`), a Staff grid (tier `staff`), and a volunteers callout; board and leader cards SHALL link to an individual member detail route rendering their full bio, quote, and background facts.

#### Scenario: Staff cards do not link to a detail page
- **WHEN** a staff-tier card is rendered
- **THEN** it is not a link (no detail route exists for that tier)

### Requirement: Sponsor a Child page, listing, and detail
The system SHALL render a Sponsor a Child landing page (hero, "how sponsorship works" steps, "what sponsorship provides" list, FAQ), a "Meet the children" listing page with name/age filters and pagination, and a per-child detail page combining the child profile component with the donation amount widget defaulted to that child's sponsorship.

#### Scenario: Sponsoring from the child detail page pre-selects that child
- **WHEN** a visitor opens a child's detail page and proceeds to donate
- **THEN** the donation flow is pre-associated with that child, without requiring re-selection on the next step

### Requirement: Ways to Give page
The system SHALL render a Ways to Give page covering: sponsor-a-child, monthly giving, one-time donation, and corporate partnership options as pastel cards; a company-matching section with a "Let's Check" employer-match lookup; a donor-advised-fund callout; and a scoped FAQ accordion.

#### Scenario: Each giving option routes to its own flow
- **WHEN** a visitor selects "Corporate partnership" from the Ways to Give cards
- **THEN** they are routed to the Corporate Sponsorships content (either a section on this page or its own page), not the general donation widget

### Requirement: Corporate Sponsorships page
The system SHALL render a standalone Corporate Sponsorships page (hero, corporate-logo strip, "Our Impact in Numbers" stat row, the sponsorship-tier comparison table, a company-matching lookup section, and a point-of-contact card), reachable from the header's "Get involved" dropdown alongside Ways to Give and Events.

#### Scenario: Point of contact is a real person
- **WHEN** the Corporate Sponsorships page renders its point-of-contact card
- **THEN** it shows a named contact (e.g. from the team-members collection) with a title, phone, and email, not a generic form-only fallback

### Requirement: Events page and event detail
The system SHALL render an Events page with a featured/upcoming carousel, a corporate-logo strip, a "save the date" grid of upcoming events, a paginated past-events archive, and a "celebrate while giving back" callout; each event's detail page SHALL render its own hero, program schedule, inclusions list, ticket pricing cards, sponsor-package comparison table, silent auction grid (if any), impact stats, and testimonials.

#### Scenario: Event without silent auction items renders without that section
- **WHEN** an event has no linked auction items
- **THEN** its detail page skips the Silent Auction section entirely (see cms-collections: Silent auction items)

### Requirement: Blog index and article
The system SHALL render a Blog index page with a featured article, category filter pills (View all/Stories/Events/Financials/News), a paginated grid, a newsletter signup, and a featured sidebar; each article SHALL render its own detail page with title, author, date, body, and the same newsletter/featured sidebar.

#### Scenario: Category filter updates the grid without losing pagination controls
- **WHEN** a visitor selects the "Events" category pill
- **THEN** the grid re-renders with only Events-category posts and pagination reflects the filtered count

### Requirement: Contact page
The system SHALL render a Contact page with a hero, a "multiple ways to reach us" card set (general inquiries, donation support, media/press, corporate partnerships), a contact form, business-hours/office info, and a scoped FAQ accordion.

#### Scenario: Selecting a reach-us card scrolls to or pre-fills the relevant form section
- **WHEN** a visitor selects the "Media and press" card's action
- **THEN** the contact form's topic field is pre-set to the corresponding topic

### Requirement: Privacy Policy page
The system SHALL render a Privacy Policy page from the foundation's approved policy text, linked from the footer on every page; Terms of Use and Donor Bill of Rights SHALL remain footer-linked labels without a built page until their copy is supplied.

#### Scenario: Unbuilt legal links do not 404 silently
- **WHEN** the footer renders Terms of Use or Donor Bill of Rights
- **THEN** either the link is omitted or it points to a clearly-labeled "coming soon" placeholder, never a broken route

### Requirement: Earthquake Relief campaign page
The system SHALL render a campaign landing page with hero, "what happened" narrative + image grid, a support-centers map, a proceeds/impact callout, a "how to help" three-card set (pray/supplies/donate), a keep-in-touch form, a four-stage response tracker (assessment/stabilization/strengthening/sustainability), and a latest-updates feed from the campaign-updates collection.

#### Scenario: Campaign page is reachable even when the banner is off
- **WHEN** the site-wide announcement banner is hidden because the campaign is marked inactive
- **THEN** the Earthquake Relief page itself remains reachable via direct link and footer/nav if still listed
