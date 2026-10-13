## Why

The Victoria‑Venezuela Foundation requires a new web presence that showcases its mission, engages supporters, and facilitates donations via Donorbox. The current site is missing a modern, responsive Astro‑based implementation with integrated CMS. Building this site will improve user experience, accessibility, and streamline content management.

## What Changes

- Implement a fully responsive Astro website for the foundation.
- Identify and define CMS collection schemas for reusable content (e.g., news, projects, events).
- Build reusable Astro components and nested component patterns for visual consistency.
- Create a design system token set to simplify styling.
- Set up React Storybook for component visualization.
- Integrate Donorbox embed/iframe for donation functionality.
- Ensure mobile‑first design and accessibility compliance.

## Capabilities

### New Capabilities
- **front-end**: A new front‑end stack based on Astro with component‑first architecture.
- **cms-collections**: Defines CMS collections (e.g., news, projects, events) to be managed via the chosen content platform.
- **design-system**: A token set (colors, spacing, typography) for consistent styling across components.
- **component-library**: Reusable Astro components (header, footer, CTA cards, donation button) with nested component patterns.
- **storybook-setup**: React Storybook configuration for component development and documentation.
- **donation-integration**: Donorbox iframe integration for seamless donation flows.

### Modified Capabilities
- None at this time.

## Impact

- Front‑end code in the `src` and `public` directories.
- CMS schema definitions in a `src/content` folder (depending on the chosen CMS).
- Design tokens added to a stylesheet or SCSS module.
- Storybook configuration files in `storybook` directory.
- Donorbox donation page to be embedded in relevant pages.

The change introduces clear contract points for the implementation phase: component patterns, CMS schema definitions, and design tokens.
