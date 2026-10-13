## ADDED Requirements

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
