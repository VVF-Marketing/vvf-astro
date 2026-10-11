## Purpose
The front‑end stack enables a modern, responsive, Astro‑based website that supports the foundation’s content and donation workflows.

## ADDED Requirements

### Requirement: Responsive rendering
The website SHALL render correctly on all devices, scaling layouts appropriately for mobile, tablet, and desktop.

#### Scenario: Mobile view
- **WHEN** the site is accessed on a viewport narrower than 768px
- **THEN** the layout adapts to a single‑column flow, maintaining usability.

### Requirement: Astro component rendering
The front‑end SHALL use Astro components to compose pages.

#### Scenario: Component usage
- **WHEN** a page imports a `Header` component
- **THEN** the rendered output includes the site navigation.
