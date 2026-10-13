# cms-collections Specification

## Purpose

EmDash collections backing every dynamic list and detail page, populated with the live site's published content so editors manage real data after cutover.

## Requirements

### Requirement: Resources collection
The system SHALL define a `resources` collection with: title, slug, category (`stories`, `financials-transparency`, plus any further live category), published date, last-updated date, authors (name and role), excerpt, hero image, rich-text body, optional downloadable file (PDF), and SEO title, meta description, and social image.

#### Scenario: Resource with download
- **WHEN** a resource has a file attached (e.g. Impact Report 2025 PDF)
- **THEN** the resource detail page offers a download link to the locally hosted file

#### Scenario: Category listing
- **WHEN** resources are queried by category `financials-transparency`
- **THEN** only resources in that category are returned, newest first

### Requirement: Child about field
The `children` collection SHALL include an optional `about` text field holding the "About <name>" paragraph shown on the live child page.

#### Scenario: About section shown
- **WHEN** a child has an `about` value
- **THEN** the child detail page renders it under an "About <display name>" heading

#### Scenario: About section absent
- **WHEN** a child has no `about` value
- **THEN** no empty "About" heading is rendered

### Requirement: Collections populated from live content
After migration, the team members, children, events (with their sponsorship packages, auction items, and sponsors), FAQs, and resources collections SHALL contain every item published on the live English site, with matching slugs, text, and images, replacing the placeholder seed data.

#### Scenario: Children count
- **WHEN** the children listing renders after seeding
- **THEN** it lists the same set of children as the live `/sponsor-a-child-list-page`

#### Scenario: Placeholder content removed
- **WHEN** the seed is regenerated from the snapshot
- **THEN** no placeholder entries from the previous seed remain in collections that exist on the live site

### Requirement: Report kind on resources
The `resources` collection SHALL include an optional report kind (`annual` or `quarterly`) identifying financial reports for the Financials & Transparency page.

#### Scenario: Migrated reports classified
- **WHEN** the seed is generated from the live snapshot
- **THEN** each annual or impact report is marked `annual` and each "Your Impact" update is marked `quarterly`

### Requirement: Testimonials collection
The system SHALL define a `testimonials` collection with a quote, the person's name and role, and an optional photo, with drafts and revisions like the other editable collections.

#### Scenario: Empty by default
- **WHEN** the seed is applied
- **THEN** the testimonials collection exists and has no entries
