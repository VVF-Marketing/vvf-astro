## MODIFIED Requirements

### Requirement: Live-site token source of truth
Design tokens SHALL follow the VVF website specification's design system (sections 5.1 to 5.4). Where an existing project token or a live Webflow CSS value conflicts with it, the spec SHALL win. Every token SHALL be named after its spec token (`navy`, `blue`, `radius-card-lg`, …), and its comment SHALL give the spec section.

#### Scenario: Token traces to live variable
- **WHEN** a reviewer inspects any colour, font, radius, shadow or spacing token
- **THEN** its name or comment names the spec token and section it implements (e.g. `navy`, spec 5.1)

### Requirement: Live color palette
The system SHALL expose exactly these colour tokens:
- `navy` `#02335E`
- `blue` `#00ABF9`
- `sky` `#C1E7F5`
- `sun` `#F9EAC6`
- `salmon` `#FFD7D7`
- `grey-line` `#E7E7E7`
- `white` `#FFFFFF`
- `page` `#F2F2F2`
- `link` `#1E73BE`
- the form-message pairs: success `#CEF5CA` / `#114E0B`, warning `#FCF8D8` / `#5E5515`, error `#F8E4E4` / `#3B0B0B`

No component SHALL use a colour outside this list. The only other values allowed in the built CSS are the shadow tokens. Text on `blue` SHALL be `navy`, and text on `navy` SHALL be `white`.

#### Scenario: Default body colors
- **WHEN** any page renders body text with no section override
- **THEN** text uses `navy` and the page background is `page` (`#F2F2F2`), on every page including event pages

#### Scenario: Focus state
- **WHEN** a keyboard user focuses a link, button, or field
- **THEN** a visible focus indicator uses `blue`

#### Scenario: Table colors from tokens
- **WHEN** a rich-text table renders
- **THEN** its borders, header and note use palette tokens only (`grey-line`, `sky`, `navy`)

### Requirement: Live typography
The system SHALL load only Nunito and Open Sans. It SHALL set the body text size on the page itself: 18 px from 768 px up, 16 px below.

Desktop sizes apply from 768 px; phone sizes apply below 768 px.

| Style | Desktop | Phone | Font and weight | Line height |
| --- | --- | --- | --- | --- |
| H1 | 48 | 36 | Nunito 800 | 1.1 |
| H2 | 48 | 36 | Nunito 800 | 1.2 |
| H3 | 32 | 24 | Nunito 700 | 1.2 |
| H4 | 20 | 20 | Nunito 800 | 1.4 |
| Big number | 80 | 64 | Nunito 800 | 1.3 |
| Stat figure | 56 | 48 | Nunito 800 | 1.16 |
| Body | 18 | 16 | Nunito 400 | 1.5 |
| Small | 14 | 14 | Open Sans 400 | 1.5 |
| Tagline | 14, uppercase, letter-spacing 1.4 px | 14 | Open Sans 600 | 1.5 |
| Button | 18 | 18 | Nunito 700 | 1.5 |

Rich-text section headings (articles, Privacy Policy) SHALL use 32 / 28 px Bold. The newsletter card title SHALL be 36 px, a named exception.

#### Scenario: Heading font
- **WHEN** an `h1` renders on desktop
- **THEN** it uses Nunito at 48 px, weight 800, line height 1.1

#### Scenario: Paragraph font
- **WHEN** a paragraph renders with no component override
- **THEN** it uses Nunito at 18 px on desktop and 16 px on phones

#### Scenario: Responsive heading step-down
- **WHEN** the same `h1` renders below 768 px
- **THEN** it uses 36 px

### Requirement: Live shape, spacing, and container scales
The system SHALL expose:
- **Radii:** `radius-pill` 9999 px (buttons, filter pills), `radius-card-lg` 40, `radius-card` 20, `radius-card-sm` 16 and `radius-tag` 4.
- **Shadows:** `shadow-card` 0 2 16 rgba(2,51,94,0.06), `shadow-arrow` 0 4 9 rgba(0,0,0,0.18), and the card hover shadow 0 8 24 rgba(2,51,94,0.12).
- **Content column:** at most 1280 px.
- **Side gutters:** 64 px from 768 px, 32 px from 480 to 767 px, and 24 px below 480 px.
- **Section padding:** each section's top and bottom padding SHALL be one of 0, 64 or 120 px from 768 px, and one of 0, 40 or 64 px below.
- **Title-to-content gap:** 64 px from 768 px, 40 px below.

#### Scenario: Section rhythm
- **WHEN** a standard content section renders
- **THEN** its top and bottom padding are each one of the allowed values for the width, and its content sits in the 1280 px column with the gutter for that width
