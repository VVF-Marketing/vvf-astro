## Context
The foundation requires a modern Astro site with a CMS for content (news, projects, events), a design system for consistent styling, and a donor‑box integration for fundraising. We will use Astro’s component‑first approach and integrate with an existing headless CMS (e.g., Sanity, Contentful) and a Storybook instance for visual QA. Mobile‑first design and accessibility are paramount.

## Goals / Non-Goals
**Goals:**
- Deliver a responsive, mobile‑friendly Astro website with fast image rendering.
- Provide CMS collections for reusable content.
- Establish a component library and design tokens for consistent UI.
- Embed Donorbox via iframe without page reloads.
- Enable Storybook for component testing and documentation.

**Non-Goals:**
- Building a backend API (the site is static/content‑driven). 
- Implementing complex user authentication; focus is on public-facing pages.

## Decisions
1. **Framework:** Astro v4 with React integration. Astro enables server‑side rendering of Markdown content while keeping static generation benefits.
2. **CMS:** Use Sanity.io (free tier) due to its portable schemas and rich media handling. Collections will be defined via Sanity schemas.
3. **Component Library:** Build reusable Astro components (Header, Footer, CTA, DonationBanner). These will be stored in `/src/components`.
4. **Design System:** Store tokens in `/src/styles/tokens.css` and expose them via CSS variables. Color palette, spacing, typography defined once and used across components.
5. **Storybook:** Configure `@storybook/astro` to run on `localhost:6006`. Components will have stories for default, mobile, and with Donorbox.
6. **Donorbox:** Embed via a dedicated `<DonationWidget />` component that renders an iframe with Donorbox configuration. The component will lazy‑load for performance.
7. **Responsiveness:** Use CSS Grid/Flexbox and media queries; follow mobile‑first breakpoint at 768px.
8. **Accessibility:** Use semantic HTML, ARIA attributes where needed, and contrast ratios per WCAG AA.
9. **Testing:** Unit tests with Vitest for logic; Visual regression with Playwright.

## Risks / Trade-offs
- **CMS cost:** Sanity free tier limits; if more content is needed upgrade plan. Mitigation: Use low content volume or switch to Ghost.
- **Framework lock‑in:** Astro is opinionated; switching later could be costly. Mitigation: keep components agnostic.
- **Donorbox iframe bandwidth:** Might slow load; use lazy loading. 
- **Storybook size:** Large component bundle may increase dev build times. Mitigation: split into minimal stories.

## Migration Plan
1. Scaffold Astro + Sanity config.
2. Create design tokens and base styles.
3. Build component library.
4. Add CMS schemas and seed content.
5. Implement Donate widget.
6. Run Storybook, verify.
7. Deploy preview, do user testing.

## Open Questions
- Which CMS is preferred? (Sanity, Contentful, etc.)
- Do we need dynamic SEO metadata per page?
- Should the site support multiple languages?
