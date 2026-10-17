## MODIFIED Requirements

### Requirement: Our Programs page
The site SHALL serve `/our-programs` and `/es/our-programs` as the live page shows it (VVF website spec 7.19), in order: a hero with Explore (to the Nutrition block) and Donate, how the programs work together, the Nutrition (`#programs`), Medical care (`#medical-care`) and Education (`#education`) program blocks, the global development goals panel with Donate and Sponsor, and the videos ("Stories of transformation", the same list as Home). Each program block SHALL have a tagline, a heading, one paragraph, a Support button to Sponsor a Child, and its photos with captions. More than one photo SHALL show one dot per photo and move one photo per mouse drag without following a link; one photo SHALL show no dots. The share image SHALL be the hero photo cropped to 1200 × 630.

#### Scenario: Programs sections
- **WHEN** a visitor opens `/our-programs`
- **THEN** the nutrition, medical care and education blocks appear in that order, each with a Support button to `/sponsor-a-child`

#### Scenario: Photo dots
- **WHEN** a program block has two photos
- **THEN** it shows two dots, and a block with one photo shows none

#### Scenario: Spanish fallback
- **WHEN** a visitor opens `/es/our-programs`
- **THEN** the page shows the live Spanish page's copy, any slot still empty in Spanish shows its English copy, and the page canonicalizes to the Spanish URL

### Requirement: Testimonials only when real
Testimonials SHALL show only published entries from the testimonials collection, and no testimonials section SHALL render when there are none. Our Programs SHALL show no testimonials: its "Stories of transformation" section is the video list.

#### Scenario: No testimonials
- **WHEN** the testimonials collection has no published entries
- **THEN** no page shows a testimonials section

#### Scenario: Testimonial added
- **WHEN** an editor publishes a testimonial and picks it on an event
- **THEN** it appears in that event's recap
