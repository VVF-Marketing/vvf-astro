---
title: Styling & Design Tokens
description: How to style components with the design tokens in tailwind.config.cjs.
---

Colour values live in one file, [`src/styles/tokens.cjs`](https://github.com/anclist/vvf-astro/blob/main/src/styles/tokens.cjs), named after the spec's tokens (5.1). `tailwind.config.cjs` builds its palette and the CSS variables (`--navy`, `--blue-text`, …) from it; type, radii and spacing tokens are in `tailwind.config.cjs` itself. See the [Design Token Reference](/design-tokens/) for every value. Use tokens, never hex codes: `class="bg-brand-primary text-neutral-white"`, not `class="bg-[#02335e] text-white"`. A unit test (`src/styles/tokens.test.ts`) fails on any colour literal in a component, page, layout or stylesheet; a widget that needs a colour value imports it from `tokens.cjs` (as `EarthquakeAppeal` does).

## Colors

| Group | Classes | Use |
| --- | --- | --- |
| Brand | `brand-primary` (`navy`), `brand-accent` (`blue`), `brand-accent-text` (`blue-text`) | Text, dark sections, button fills, bullets |
| Pastels | `sun`, `salmon`, `sky` | Card and section backgrounds |
| Neutrals | `page` (body background), `neutral-white`, `neutral-light-gray` (`grey-line`) | Surfaces, borders |
| System | `link`, `focus`, `focus-inner`, `success`, `warning`, `error` | Links, the focus ring, status messages |

**Blue text depends on the background** (Q13 on the spec card). `blue` reads well only on navy (5:1); on white and `page` it's 2.56:1, so blue text there is `blue-text`. Components that can sit on either take an `on="light" | "dark"` prop and pick the token themselves: `Button` (the `outline` and `link` variants) and `Eyebrow`; `SectionTitle` and `Breadcrumbs` pass it on from their `tone`. Don't choose the blue at the call site.

**Focus** (Q12) is one rule in `src/index.css`: a 2 px `blue` outline with a `navy` ring in the gap, kept alongside an element's own shadow. Components don't add focus colours.

## Typography

- `font-heading` / `font-sans`: **Nunito**, for headings, buttons, navigation and UI labels.
- `font-body`: **Open Sans**, for paragraph copy (bare `<p>` elements get it by default, at 18px).
- `font-poppins`: only for the event sponsorship-benefits table.
- Headings: `text-h1`…`text-h6` (desktop) and `text-h1-mobile`…`text-h6-mobile`. Bare `h1`–`h6` elements already step down below 768px.
- Copy sizes: `text-body` (18px) and `text-size-xs`…`text-size-3xl`.

## Radii, spacing and layout

- Radii: `rounded-sm` … `rounded-2xl` (40px, the large cards), `rounded-pill` (buttons), `rounded-full`.
- Section spacing on live is 120px desktop and 64px phone; containers use `max-w-screen-xl` (1280px), `max-w-container-medium` and `max-w-container-large`.
- Breakpoints follow Webflow: `sm` 480px, `md` 768px, `lg` 992px, `xl` 1280px.

Regenerate the reference page after changing tokens: `node scripts/docs-tokens.mjs`.
