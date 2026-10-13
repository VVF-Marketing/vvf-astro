## Purpose

Defines the reusable Astro components every page composes, so each piece of UI (header, cards, tables, accordions) has one consistent implementation instead of being rebuilt per page.

## ADDED Requirements

### Requirement: Site chrome (header, announcement banner, footer)
The system SHALL provide a header with logo, primary nav (with a "Get involved" dropdown for Ways to Give / Corporate Sponsorships / Events), a "Contact Us" outline button, and a "Donate" filled button; an optional dismissible announcement banner above the header for time-sensitive campaigns (e.g. earthquake relief); and a footer with org description, tax ID/address, nav link columns, the Candid Platinum Transparency seal, social icons, and legal links (Privacy Policy always linked; Terms of Use and Donor Bill of Rights links appear only once those pages exist).

#### Scenario: Mobile nav collapses to a menu
- **WHEN** the header is viewed below the tablet breakpoint
- **THEN** the primary nav collapses into a slide-out menu reachable via a hamburger control, preserving the same link set and the Contact Us / Donate actions

#### Scenario: Announcement banner only shows when a campaign is active
- **WHEN** no active campaign banner is configured
- **THEN** the header renders without the banner and without reserving its space

### Requirement: Hero and impact sections
The system SHALL provide a hero component (background image, floating content card with heading/subtext/CTA pair) and a stat-tile row component (label + large number, 4-up desktop, 1-up mobile), and a dark full-bleed "impact" banner component (heading, body copy, bullet list, image, CTA) for narrative/connection sections.

#### Scenario: Hero renders on every top-level page
- **WHEN** a page is one of Home, Our Team, Sponsor a Child, Ways to Give, Events, Contact, or Earthquake Relief
- **THEN** it renders the hero component with page-specific image, heading, and CTA pair

### Requirement: Program and step cards
The system SHALL provide a three-color pastel card component (icon, category label, title, body, optional CTA) used for the "How we help" program set and the "Three steps to change" set, always rendered in a group of three using the design system's pastel triad.

#### Scenario: Program card without a CTA
- **WHEN** a program card is rendered for an informational (non-actionable) item
- **THEN** the CTA slot is omitted without leaving a visual gap

### Requirement: List cards (event, blog, team, child, auction, ticket)
The system SHALL provide: an event card with an "upcoming" variant (image, title, date badge, location, description, Learn More CTA) and a "past" variant (compact, image-optional, title/date/location/description, no CTA); a blog/article card (image, date, title, excerpt, Learn More); a team member card (photo, name, role, short bio, social icons) supporting board/leader/staff tiers; a child card (photo, age badge, name) for the sponsorship grid; a silent-auction item card (image, name, value, bid CTA); and a ticket/pricing card (tier name, price, feature list, buy CTA).

#### Scenario: Past event card omits the CTA
- **WHEN** an event card's variant is "past"
- **THEN** no Learn More / Register CTA is rendered, only the event's descriptive content

#### Scenario: Child card links to a detail page
- **WHEN** a child card is rendered in the "Meet the children" grid
- **THEN** clicking it navigates to that child's detail page, carrying its identifier

### Requirement: Child profile detail
The system SHALL provide a child profile layout showing photo, age, birthday, gender, and a "dream" quote, each in its own pastel info-card, alongside a donation panel for sponsoring that specific child.

#### Scenario: Child profile links back to the listing
- **WHEN** a child detail page is rendered
- **THEN** a breadcrumb links back to "Meet the children"

### Requirement: Sponsorship tier comparison table
The system SHALL provide a comparison table component listing sponsorship tiers (e.g. Trustee/Diamond/Gold or Trustee/Leader/Advisor/Friend) as columns and benefit rows (pre-event, event-day, post-event recognition; promotional items) as a checkmark/value grid, with a buy/select CTA per tier.

#### Scenario: Tier table collapses on mobile
- **WHEN** the comparison table is viewed at mobile width
- **THEN** it renders as stacked per-tier cards rather than a horizontally scrolling table body wider than the viewport

### Requirement: FAQ accordion
The system SHALL provide an accordion component where each item shows a question row that expands/collapses to reveal an answer, only one item's expand state affecting its own row.

#### Scenario: Expanding one FAQ does not close others
- **WHEN** a user expands one FAQ item
- **THEN** other already-expanded items remain expanded (independent accordion items, not single-open)

### Requirement: Carousels
The system SHALL provide a carousel component for testimonial/story cards and a logo-strip carousel for corporate partner logos, both with prev/next controls and, for the testimonial carousel, position dots.

#### Scenario: Logo carousel loops
- **WHEN** the corporate logo carousel reaches the last logo and next is pressed
- **THEN** it wraps back to the first logo

### Requirement: Forms
The system SHALL provide a newsletter signup component (email input + subscribe button + privacy microcopy) and a contact form component (name/email/phone, topic select, "how would you describe yourself" radio group, message textarea, privacy-policy checkbox, submit).

#### Scenario: Contact form blocks submit without consent
- **WHEN** the privacy-policy checkbox is unchecked
- **THEN** the submit action is disabled or rejected client-side before any network request

### Requirement: Donation amount widget
The system SHALL provide a "choose amount" donation widget component (one-time/monthly toggle, currency select, preset amount buttons, custom amount input, optional target-selection e.g. "Sponsor a Child") that hands off the selected amount and cadence to the donation-integration capability's checkout flow.

#### Scenario: Custom amount overrides preset selection
- **WHEN** a user types a custom amount after selecting a preset
- **THEN** the custom amount becomes the active selection and no preset button remains visually selected
