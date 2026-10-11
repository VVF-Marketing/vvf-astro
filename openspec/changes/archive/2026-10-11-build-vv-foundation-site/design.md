## Context

Repo is a bare Astro 7 + React integration + Tailwind scaffold (`src/pages/index.astro`, `src/layouts/Layout.astro`, `src/index.css`); no CMS, no Storybook, no content collections exist yet. See proposal.md for motivation. The PDF design reference (`Victoria Venezuela Foundation.pdf`) is the source of truth for tokens, components, pages, and the resolved Donorbox CTA targets (its "Navigation Reference" and "CTA Re-audit" pages record exact link destinations, e.g. Donorbox event id `937157`, campaign `venezuela-earthquake-relief`, campaign `general-donation-vvf`).

## Goals / Non-Goals

**Goals:**
- Static-first Astro site: pages render at build time from Sanity content, no client-side data fetching required for initial render.
- One design-token source (Tailwind config + CSS custom properties) consumed by every component.
- Sanity schemas mirror the capability boundaries in cms-collections/spec.md exactly (one schema type per collection listed there).

**Non-Goals:**
- No custom payment processing — Donorbox handles all money movement (iframe/link embeds only).
- No Storybook in this change (dropped per explore-mode decision; can be a later change if wanted).
- No build of Terms of Use / Donor Bill of Rights pages (copy not yet supplied).
- No i18n: the child-detail Donorbox embed shown in the PDF is Spanish-language (Donorbox-hosted), which is Donorbox's own behavior, not something this build controls.

## Decisions

**Astro content source: Sanity, not Astro native content collections.** The site is photo-heavy (child photos, event galleries, team headshots) and Sanity's image pipeline (CDN, hotspot/crop, on-the-fly transforms) is worth the extra moving part; a git-based option (Keystatic/native collections) was considered but rejected for this reason. Fetch pattern: a thin `src/lib/sanity.ts` client, used only in `.astro` frontmatter (build-time `getStaticPaths`/data fetch), not shipped to the client bundle.

**Sanity Studio location: `studio/` workspace at repo root**, separate `package.json` from the Astro app, deployed independently (Sanity's own hosting). Keeps the editor's dependency tree out of the site's build.

**Images: Sanity's image CDN URL builder, rendered through Astro's `<Image>`** where the image is fixed at build time (most cases), falling back to a plain `<img src>` with Sanity's `?w=`/`?auto=format` query params only for any genuinely dynamic (client-filtered) list where `<Image>` can't pre-optimize.

**Team roster targets the PDF's "V2 Proposed" page**, not the original placeholder team page: Board (Randy Lander, Helen Bello, Pastor Jose Guerrero), Leadership (adds Charmiant Corado, Juan Tomasini, Enrique Flores), Staff (~24 named people). Confirmed with the user during exploration.

**Donation amount widget vs raw Donorbox iframe:** the PDF shows both a plain Donorbox iframe (child sponsorship "Elegir la cantidad" panel, embedded as-is) and custom-styled pastel CTA cards linking out to Donorbox (Ways to Give, event tickets). Build the custom "choose amount" component (component-library) for on-site pastel cards, and embed Donorbox's own iframe unmodified wherever the PDF shows Donorbox's own UI chrome (the child-sponsorship panel) — don't reskin Donorbox's hosted widget.

**Age-range filter is a fixed enum** (`0-2`, `3-5`, `6-8`, `9-11`, `12-14`, `15+`) matching the PDF's filter panel exactly, computed from each child's stored age rather than re-derived from birthday at request time (keeps the filter static-friendly).

**Content adapter with local fixtures until a real Sanity project exists.** No Sanity project/dataset/token exists yet (creating one requires the foundation's own account). Rather than block all page/component work on that, `src/lib/content/index.ts` exposes one `getX()` function per collection (`getEvents`, `getChildren`, `getTeamMembers`, etc.); each checks whether a real `SANITY_PROJECT_ID` is configured and, if not, returns typed local fixtures from `src/lib/content/fixtures/` shaped identically to the normalized Sanity result (including images pre-resolved to a plain `imageUrl` string via `urlFor`, so components never branch on data source). Pages/components are written against `getX()` only, never against `sanityClient` directly, so pointing this at a real project later is a data-source swap, not a rewrite. Fixtures never fabricate photos of real children — a `child` fixture's `imageUrl` is left unset and the UI renders its placeholder state, consistent with the PDF's own "IMAGE HERE" placeholder treatment for content not yet photographed.

## Risks / Trade-offs

- **[Risk]** The `child` collection stores real names, ages, and photos of vulnerable children in a public dataset. → **[Mitigation]** Schema includes an optional display-name/alias field distinct from a private full-name field (private field never rendered by the front-end), and publishing any child document requires the foundation's own consent/safeguarding sign-off before the front-end query includes it — enforced by a `published: boolean` gate in the schema, not by the front-end trusting Sanity's draft state alone.
- **[Risk]** Donorbox event/campaign IDs are hard external references (`937157`, `venezuela-earthquake-relief`, `general-donation-vvf`); if Donorbox IDs change, links break silently. → **[Mitigation]** Store these as CMS fields (per cms-collections: Events, Earthquake relief updates), not hard-coded in components, so they're editable without a code change.
- **[Risk]** Two CMS options were viable (Keystatic vs Sanity); Sanity adds an external service dependency and (at scale) a paid tier. → **[Mitigation]** Accepted trade-off per user decision, given the photo-heavy content; revisit only if hosting cost becomes a concern.
- **[Trade-off]** Static generation means new Sanity content requires a rebuild/redeploy to appear (no ISR/on-demand revalidation in this change). Acceptable for a low-frequency-update nonprofit site; can be added later via Sanity webhooks if editors need faster turnaround.

## Migration Plan

Greenfield build, no existing production site or data to migrate. Deploy is a fresh Astro static build; no rollback concerns beyond normal git revert.
