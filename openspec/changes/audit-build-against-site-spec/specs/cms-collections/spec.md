## ADDED Requirements

### Requirement: Content model follows the spec's Appendix B
The system SHALL define one EmDash collection per content type in the VVF website spec's content model (section 4, Appendix B): `events`, `event_offers`, `benefit_rows`, `auction_items`, `testimonials`, `faqs`, `children`, `team_members`, `articles`, `categories`, `authors`, `partners` and `site_facts`. Each SHALL have every field of its type, with a compatible field type and the same required flag.

Fields the spec marks as per language SHALL be translatable. All other fields SHALL be shared by both languages. Enums SHALL store language-neutral keys. Ordered references SHALL keep the editor's order.

The earlier `resources`, `sponsors` and `sponsorship_packages` collections SHALL be replaced by these types.

#### Scenario: Every Appendix B field exists
- **WHEN** the seeded schema is compared with Appendix B
- **THEN** every type and field exists with a compatible type and its required flag

#### Scenario: One person, one record
- **WHEN** a team member belongs to the board and the staff
- **THEN** one `team_members` record holds both groups, with one slug and one bio page

#### Scenario: Benefit grid keyed by offer
- **WHEN** an event's benefit rows are read
- **THEN** each row's cells are keyed by package offer id, and the columns follow the event's package offers in their sort order

### Requirement: Impact figures are site facts
Every impact figure on the site SHALL come from `site_facts`, each with its value as displayed, its label and detail in both languages, its period, an optional source article, and an approved flag. A figure that is not approved SHALL not be shown anywhere. Until VVF confirms a figure's period and source, its period SHALL say that confirmation is pending, so no figure is published as checked when it isn't.

#### Scenario: Unapproved figure
- **WHEN** a site fact's `approved` flag is off
- **THEN** no page shows that figure

### Requirement: Spanish-complete publishing
Publishing an item of the content model in English, through the admin, the REST API or MCP, SHALL be refused while its Spanish version is missing or has an empty required per-language field (Q6), with a message naming the empty fields. Publishing the Spanish version itself, and page copy (which falls back to English), SHALL not be affected.

#### Scenario: Spanish answer empty
- **WHEN** an editor publishes an English FAQ whose Spanish answer is empty
- **THEN** the CMS refuses with "Fill in the Spanish version before publishing. Still empty: Answer."

### Requirement: Recap reminder
The CMS dashboard SHALL show, for every event whose date has passed while it's still marked upcoming, a reminder to set it to past or cancelled and the recap fields still empty (Q8). The reminder email follows once the site has hosting.

#### Scenario: Event past its date
- **WHEN** an editor opens the dashboard two days after an event that's still upcoming
- **THEN** an "Event recaps" alert names the event and lists its empty recap fields

### Requirement: No private child names
The `children` collection SHALL hold no full name: a child is stored and shown by first name and last initial only (Q5). The internal Donorbox sponsorship reference stays, never shown. The site SHALL have no `posts` or `campaign_updates` collections (Q4, Q11).

#### Scenario: Child fields
- **WHEN** the children schema is read
- **THEN** it has no full-name field

## MODIFIED Requirements

### Requirement: Resources collection
The system SHALL define an `articles` collection (spec type `article`) with: title, slug, publish date, a required category reference, one or two ordered author references, featured image, excerpt, rich-text body, featured flag, optional report PDF and report type (`annual`, `quarterly`), last updated date, SEO title, meta description, social image, and the external-article fields (external flag, external URL, outlet, language tag). The `categories` collection SHALL hold the categories `stories`, `financials` and `news`. No article SHALL use a category slug as its own slug.

#### Scenario: Resource with download
- **WHEN** an article has a report PDF attached (e.g. Impact Report 2025)
- **THEN** the article page offers a download link to the locally hosted file

#### Scenario: Category listing
- **WHEN** articles are queried by the category `financials`
- **THEN** only articles in that category are returned, newest first

### Requirement: Child about field
The `children` collection SHALL include an optional `story` rich-text field (spec field `story`), holding the "About <name>" text shown on the child profile, replacing the earlier `about` field.

#### Scenario: About section shown
- **WHEN** a child has a `story` value
- **THEN** the child profile renders it under an "About <name>" heading

#### Scenario: About section absent
- **WHEN** a child has no `story` value
- **THEN** no empty "About" heading is rendered

### Requirement: Collections populated from live content
After migration, the content model's collections SHALL contain every item published on the live site, in English and Spanish, with matching slugs, text and images. That covers events with their offers, benefit rows, sponsors and FAQs; children; team members; articles with their categories and authors; partners; and FAQs.

Facts the live site's pages don't expose SHALL be set to the value the live page shows today and recorded in the migration code:
- each event's lifecycle and registration, from its date;
- the featured flags;
- children's sponsorship status, from whether the profile is listed;
- partners' active flag, from whether the partner shows on the general strips.

#### Scenario: Children count
- **WHEN** the children listing renders after seeding
- **THEN** it lists the same set of children as the live `/children` page

#### Scenario: Placeholder content removed
- **WHEN** the seed is regenerated from the snapshot
- **THEN** no placeholder entries from the previous seed remain in collections that exist on the live site

### Requirement: Report kind on resources
The `articles` collection SHALL include an optional report type (`annual` or `quarterly`) identifying the financial reports listed on Financials & Transparency.

#### Scenario: Migrated reports classified
- **WHEN** the seed is generated from the live snapshot
- **THEN** each annual or impact report is marked `annual` and each "Your Impact" update is marked `quarterly`

### Requirement: Testimonials collection
The system SHALL define a `testimonials` collection with the person's name, a rich-text quote and role per language, and an optional photo, with drafts and revisions like the other editable collections. Events SHALL pick up to three testimonials for their recap.

#### Scenario: Empty by default
- **WHEN** the seed is applied
- **THEN** the testimonials collection exists and has no entries
