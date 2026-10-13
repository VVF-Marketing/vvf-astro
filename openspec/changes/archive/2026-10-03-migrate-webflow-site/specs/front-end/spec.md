## Purpose

Public pages of the foundation site, composed from library components and CMS content to mirror the live Webflow site.

## ADDED Requirements

### Requirement: Page parity with live site
Each migrated page (Home, Ways to Give, Sponsor a Child, children listing, child detail, Corporate Sponsorships, Events, event detail, Our Team, team member detail, Contact, Earthquake Relief, Privacy Policy, Resources pages) SHALL present the same sections, in the same order, with the same copy and imagery as its live English counterpart, built only from library components and design tokens.

#### Scenario: Section order
- **WHEN** the local Home page is compared to the live Home page
- **THEN** sections appear in the same order with the same headings and calls to action

#### Scenario: Copy sourced from content
- **WHEN** a page section shows CMS-backed items (team, children, events, FAQs, resources, sponsors)
- **THEN** those items come from EmDash, not hard-coded in the page

### Requirement: Resources pages
The site SHALL provide `/resources` (all resources), `/resources/category/<category>` (filtered by category), and `/resources/<slug>` (detail with breadcrumbs, last-updated date, authors, body, and optional download).

#### Scenario: Stories category page
- **WHEN** a visitor opens `/resources/category/stories`
- **THEN** only resources in the stories category are listed as article cards

#### Scenario: Unknown resource
- **WHEN** a visitor requests `/resources/does-not-exist`
- **THEN** the site responds 404

### Requirement: Legacy route mapping
The following live paths SHALL redirect permanently to project routes: `/all-events` → `/events`; `/events/<slug>` stays; `/team-members/<slug>` → `/our-team/<slug>`; `/children/<slug>` → `/sponsor-a-child/children/<slug>`; `/sponsor-a-child-list-page` → `/sponsor-a-child/children`; `/venezuela-earthquake-relief` → `/earthquake-relief`; `/resources-categories/all` → `/resources`; `/resources-categories/<category>` → `/resources/category/<category>`.

#### Scenario: Earthquake relief redirect
- **WHEN** a visitor requests `/venezuela-earthquake-relief`
- **THEN** they receive a 301 to `/earthquake-relief`

### Requirement: Per-page SEO metadata
Each migrated page and CMS detail page SHALL output a title, meta description, canonical URL, and Open Graph image matching the live site's values where the live site defines them.

#### Scenario: Resource SEO
- **WHEN** a resource with SEO title and meta description is rendered
- **THEN** the page's `<title>` and `<meta name="description">` use those values

### Requirement: Staging artifacts excluded
Migrated pages SHALL NOT include Webflow staging-only elements, such as the "Missing SEO fields" bar, Webflow badge, or Webflow scripts.

#### Scenario: No staging bar
- **WHEN** any migrated resource page renders
- **THEN** no "Missing SEO fields" text appears
