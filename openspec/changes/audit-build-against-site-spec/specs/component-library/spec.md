## MODIFIED Requirements

### Requirement: Live component parity
The component library SHALL implement the VVF website spec's component set (section 5.5), one component per pattern with variants, using design tokens only (no raw colour values and no page-specific overrides).

**Button.** Variants: Primary (`blue` fill, `navy` label), Outline (`blue` 2 px border, `blue` label), Outline navy, On dark (`white` label) and Small. It is 51 px tall at the default size, with 12 px × 24 px padding and `radius-pill`. A label SHALL never break onto two lines: when two buttons don't fit side by side, the second sits under the first, 12 px below. One Button component replaces every other button style.

**Feature card.** One component with colour variants (White, Sky, Sun, Salmon, Navy) and media variants (Icon, Image, Number, None). It covers the reward, step, appeal, giving and pill cards.

**Images.** Every content photo crops to its frame (`object-fit: cover`) and never stretches.

**Links and focus.** A linked card is a single link, containing no other link. Cards that are links show the hover shadow.

#### Scenario: Primary button
- **WHEN** a primary button renders
- **THEN** it has a `blue` background, a `navy` label in Nunito 18 px weight 700, 12 px × 24 px padding, a pill radius and a height of 51 px

#### Scenario: No raw colors in components
- **WHEN** component source is searched for hex colour literals
- **THEN** none are found outside the token definition files

#### Scenario: Stories reflect live styling
- **WHEN** a component's Storybook story is viewed
- **THEN** it renders the spec variant(s) with migrated sample content

### Requirement: Dropdown site navigation
The header SHALL present the spec's navigation (section 3.2) in the page's language:
- **Menus:** "Make a Difference" (Sponsor a Child, Ways to Give, Corporate Sponsorships, Events & Campaigns), "About" (Our Programs, Our Team, Financials & Transparency) and "Resources" (All Resources, Stories, Financial Reports, and News only while a News article is published).
- **Language switch:** EN and ES, keeping the visitor on the same page.
- **Buttons:** Donate and Contact Us.

Desktop menus SHALL open on hover and on keyboard focus. On phones the hamburger opens the menu, and tapping a menu label opens its list without leaving the page.

#### Scenario: Keyboard navigation
- **WHEN** a keyboard user tabs to "Resources" and presses Enter or Down Arrow
- **THEN** the submenu opens, focus moves into it, and Escape closes it and returns focus to the toggle

#### Scenario: Mobile menu
- **WHEN** the header renders below 992 px
- **THEN** links collapse behind a menu button that exposes `aria-expanded`, and tapping a menu label opens its list without leaving the page

### Requirement: Breadcrumbs
The system SHALL provide a breadcrumb component, rendered as an ordered list inside a labelled `nav`, with the current page marked `aria-current="page"`. Every crumb except the last SHALL be a link in the page's language, following spec 2.3:
- Child profile: Sponsor a Child › Meet the Children › name
- Team bio: Our Team › name
- Article: Resources › category › title
- Resources category: Resources › category

#### Scenario: Child detail breadcrumb
- **WHEN** a child detail page renders
- **THEN** breadcrumbs show "Sponsor a Child" and "Meet the Children" (linked) followed by the child's name (current)
