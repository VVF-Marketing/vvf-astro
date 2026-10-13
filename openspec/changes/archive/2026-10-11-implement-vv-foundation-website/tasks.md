## 1. Project Setup

- [x] 1.1 Initialise Astro project (use `npm create astro@latest` with React integration) and verify that `astro dev` serves a healthy landing page.
- [x] 1.2 Install required dependencies: `@astrojs/react`, `vitest`, `@storybook/astro`, `sanity`, `donorbox-embed` (e.g., via `donorbox-iframe`). Verify `npm install` completes successfully.

## 2. CMS Schema & Content

- [x] 2.1 Create Sanity CMS configuration in `sanity.json` and define schemas for `news`, `projects`, and `events` as specified in specs/cms-collections/spec.md. Verify schemas validate with `sanity schema develop`.
- [x] 2.2 Seed test content for each collection and confirm they render on the site in dev mode.

## 3. Design System & Tokens

- [x] 3.1 Generate CSS variable file `src/styles/tokens.css` with primary, secondary, background, surface, error colors, spacing, and typography as per design.md.
- [x] 3.2 Import `tokens.css` globally in `src/layouts/Base.astro` and verify styles apply to a test component.

## 4. Component Library

- [x] 4.1 Implement reusable Astro components (`Header.astro`, `Footer.astro`, `CTAButton.astro`, `DonationWidget.astro`) following patterns from design.md. Verify each component renders in isolation.
- [x] 4.2 Create nested component structure for responsive layout (e.g., mobile header collapses to hamburger). Verify responsive behavior at 480px breakpoint.

## 5. Storybook Integration

- [x] 5.1 Configure Storybook via `storybook/main.js` for Astro and React, add story for `Header`, `CTAButton`, `DonationWidget`.
- [x] 5.2 Run `npm run storybook` and confirm stories appear without errors.

## 6. Donation Integration

- [x] 6.1 Build `DonationWidget.astro` to embed Donorbox iframe lazily. Confirm iframe loads on a donation page.
- [x] 6.2 Create demo donation page using the widget and verify donation flow works in preview.

## 7. Responsive & Accessibility

- [x] 7.1 Add mobile‑first media queries to layout components, ensuring readable contrast and keyboard navigation.
- [x] 7.2 Run accessibility audit (eslint-plugin-jsx-a11y) and fix any reported violations.

## 8. Testing & Validation

- [x] 8.1 Write unit tests for data fetching, CMS integration, and donation widget using Vitest.
- [x] 8.2 Add visual regression tests in Storybook or Playwright for key components.
- [x] 8.3 Verify all tests pass with `npm test`.

## 9. Deployment & Preview

- [x] 9.1 Build production bundle via `npm run build` and confirm site serves correctly.
- [x] 9.2 Deploy preview (e.g., Netlify, Vercel) and verify live site matches design.

## 10. Documentation & Handover

- [x] 10.1 Update `README.md` with setup instructions, component usage, and CMS guidance.
- [x] 10.2 Deliver final artifacts to stakeholders and archive the change.
