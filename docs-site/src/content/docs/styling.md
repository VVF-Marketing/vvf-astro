---
title: Styling & Design Tokens
description: How to style components with the design tokens in tailwind.config.cjs.
---

All design tokens live in [`tailwind.config.cjs`](https://github.com/anclist/vvf-astro/blob/main/tailwind.config.cjs) under `theme` / `theme.extend`, mirrored as CSS variables in `src/index.css`. Values are copied from the live Webflow site's CSS variables (see the [Design Token Reference](/design-tokens/) for every token and its source). Use tokens instead of arbitrary values or hex codes: `class="bg-brand-primary text-neutral-white"`, not `class="bg-[#02335e] text-white"`.

## Colors

| Group | Tokens | Use |
| --- | --- | --- |
| Brand | `brand-primary` (navy), `brand-accent` (cyan), `brand-accent-soft` | Text, dark sections, buttons, links |
| Pastels | `sun`, `salmon`, `sky` | Card and section backgrounds (live order: sun → sky → salmon) |
| Neutrals | `page` (body background), `neutral-white`, `neutral-light-gray`, `neutral-card`, `neutral-section`, … | Surfaces, borders, table shading |
| System | `link`, `focus`, `success`, `warning`, `error` | Links, focus rings, status messages |
| Tables | `table-border`, `table-note` | Rich-text table outline and row dividers; source note after a table (`ContentTable`) |

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
