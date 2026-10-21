## ADDED Requirements

### Requirement: Registration notice on event pages
When an event's registration is `closed` or `sold_out`, its page SHALL show no ticket or sponsorship purchase links (hero, ticket cards, special opportunities). In their place it SHALL show a short note in the page's language, with the live site's wording:
- closed: "Registration is closed. Questions? Write to us using the contact details below."
- sold out: "Tickets are sold out. Questions? Write to us using the contact details below."

With registration `open` or `not_needed`, the page is unchanged.

#### Scenario: Closed registration
- **WHEN** an upcoming event's registration is set to `closed`
- **THEN** its page has no link to Donorbox events and shows the "Registration is closed" note

#### Scenario: Spanish note
- **WHEN** the same event is opened at `/es/events/<slug>`
- **THEN** the note is in Spanish

### Requirement: Recap stat captions
A past event's recap stats SHALL each show their value, label and, when present, the short caption under the label. The amount-raised tile SHALL show its own caption from page copy.

#### Scenario: 2025 recap captions
- **WHEN** `/events/2025-golf-tournament` is rendered
- **THEN** the "Golfers" tile shows "Took part for children in Venezuela", and the "Raised" tile shows "For nutrition, medical care and education"

### Requirement: Offer text without a list
An offer whose included text is a paragraph rather than a list SHALL carry that text into its ticket card or special-opportunity panel, the same as listed items.

#### Scenario: Physical therapy lounge
- **WHEN** the 2026 tournament page is rendered
- **THEN** the "Physical Therapy Lounge" panel holds "Help golfers warm up, improve mobility, and prepare their bodies for a stronger, more comfortable round." (its tab stays locked while the offer is sold out, as on live)

### Requirement: Event "Memories" photos
The upcoming 2026 tournament page SHALL show, in its memories mosaic, the five photos the live page uses for that section, each with its live alt text.

#### Scenario: Memories alt text
- **WHEN** `/events/2026-golf-tournament` is rendered
- **THEN** the mosaic's first image alt reads "A golfer follows through on a tee shot at the 2025 Victoria Venezuela Foundation charity golf tournament."

### Requirement: Spanish SEO on detail pages
Team profiles, event pages and resource pages SHALL use Spanish titles and descriptions under `/es`, with "Fundación Victoria Venezuela" as the brand in the title. They fall back to English only when no Spanish text exists. The Spanish Financials & Transparency page SHALL have a Spanish title and description.

#### Scenario: Spanish team profile title
- **WHEN** `/es/our-team/randy-lander` is rendered
- **THEN** its `<title>` ends with "| Nuestro equipo | Fundación Victoria Venezuela"

### Requirement: Benefits count in the page's language
On phones, each sponsor package in the benefits list SHALL say how many benefits it includes in the page's language, from a site-wide copy slot.

#### Scenario: Spanish benefits count
- **WHEN** `/es/events/2026-golf-tournament` is rendered at 390 px
- **THEN** each package reads "N de M beneficios", with no English text
