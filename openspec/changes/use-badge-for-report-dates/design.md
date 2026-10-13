## Context

See proposal.md (Why).

- **`Badge.astro`:** a `<span>` with `inline-flex rounded-sm bg-neutral-light-gray px-2 py-1 font-sans text-size-sm leading-body text-brand-primary`, plus an optional `class`. It matches live `.tag_component` and is used by `EventCard` and `ArticleCard`.
- **`ReportList.astro`, line 28:** `<p class="mb-2 bg-[#eee] px-2 py-1 font-body text-size-sm leading-body text-brand-primary">`, copied from live `.fin_report-date`. The card `<li>` is a flex column, centred on phones and left-aligned from `md`, so the label shrinks to its text either way.

## Goals / Non-Goals

**Goals:** report dates use the default badge, the same as every other badge on the site.

**Non-Goals:**
- Changing `Badge`.
- Adding a badge variant or tokens.
- Matching live `.fin_report-date` exactly. The team chose consistency with the site's other badges.

## Decisions

### D1. Default `Badge`, no variant
`ReportList` renders `<Badge class="mb-2">`. A square variant matching live `.fin_report-date` was considered and rejected by the user: report dates should look like the other badges, rounded corners included. Using the default also removes the hard-coded `#eee` without adding a token.

### D2. `<time>` inside the badge
`<Badge class="mb-2"><time datetime={iso}>{label}</time></Badge>`. `iso` is the `YYYY-MM-DD` part of `publishedAt`, matching the UTC date the label already shows. The `mb-2` spacing stays at the call site; it's spacing within the card, not part of the badge.

## Risks / Trade-offs

- **[A visible departure from the live financials page]** → It's intended. The change is small: the grey is 7 shades darker, the corners are 4px, and the font is Nunito instead of Open Sans. Screenshots before and after go in the PR.
- **[`<p>` → `<span>` changes layout]** → The `<li>` is a flex column, so the inline-flex span becomes a flex item and keeps its shrink-to-fit width and position. The e2e check covers its computed style.

## Migration Plan

Code only; a revert rolls it back.
