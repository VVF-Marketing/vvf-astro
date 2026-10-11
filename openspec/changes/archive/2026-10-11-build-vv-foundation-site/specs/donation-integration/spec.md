## Purpose

Defines how donations, sponsorships, event tickets, and sponsor-package purchases are handed off to Donorbox, per the nav map's resolved CTA targets, so money-moving actions are consistent across the site.

## ADDED Requirements

### Requirement: General and recurring donation
The system SHALL route "Donate"/"Donate now" CTAs that are not tied to a specific child, event, or campaign to the general Donorbox donation campaign (`general-donation-vvf`), passing through the selected amount, currency, and one-time/monthly cadence from the donation amount widget.

#### Scenario: Header Donate button uses the general campaign
- **WHEN** a visitor clicks "Donate" in the header from any non-campaign page
- **THEN** they are sent to the general donation campaign, not a child- or event-specific one

### Requirement: Child sponsorship donation
The system SHALL route "Sponsor" / "Sponsor a Child" CTAs on a child's detail page to Donorbox pre-associated with that child's sponsorship reference, defaulting to a monthly cadence.

#### Scenario: Sponsorship defaults to monthly
- **WHEN** a visitor opens the donation widget from a child detail page
- **THEN** "Monthly" is the pre-selected cadence (one-time remains selectable)

### Requirement: Earthquake relief campaign donation
The system SHALL route the site-wide announcement banner to the Earthquake Relief page (per the nav map's resolved "Announcement bar → Earthquake" target), and route that page's own donate CTAs to the dedicated Donorbox campaign (`venezuela-earthquake-relief`), separate from the general donation campaign.

#### Scenario: Banner leads to the page whose donate CTAs hit the earthquake campaign
- **WHEN** the site-wide earthquake-relief announcement banner is active
- **THEN** it links to the Earthquake Relief page, and every donate CTA on that page links to the `venezuela-earthquake-relief` Donorbox campaign (not the general donation campaign)

### Requirement: Event ticketing and sponsorship
The system SHALL route an event's "Buy Tickets" / "Become a Sponsor" CTAs to that event's Donorbox event page (e.g. event id `937157` for the Golf Tournament), and route its sponsor-package "Buy Now" CTAs to the matching package tier on the same Donorbox event.

#### Scenario: Ticket and sponsor CTAs share one Donorbox event
- **WHEN** a visitor buys a ticket versus becomes a sponsor for the same event
- **THEN** both actions are fulfilled through the same underlying Donorbox event, differing only by the ticket/package tier selected

### Requirement: Corporate sponsorship inquiry
The system SHALL route the Corporate Sponsorships "Partner with Us" CTA to the sponsorship signup/form flow (Donorbox form embed or the contact form pre-set to the corporate-partnerships topic), not to a generic donation amount widget.

#### Scenario: Partner with Us does not open the amount widget
- **WHEN** a visitor clicks "Partner with Us"
- **THEN** they see the sponsorship inquiry/signup flow, not the one-time/monthly amount picker used for individual donations

### Requirement: Employer donation matching lookup
The system SHALL embed the Double the Donation company-search widget on the Ways to Give and Corporate Sponsorships pages to let visitors check employer donation matching, independent of the Donorbox checkout flow.

#### Scenario: Match lookup does not require starting a donation first
- **WHEN** a visitor searches for their employer in the matching widget
- **THEN** results are shown without requiring them to have entered a donation amount or started checkout
