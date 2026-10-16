# AGENTS.md

This is the main Victoria Venezuela Foundation site (Astro + EmDash + Tailwind). `docs-site/` is a separate npm project with its own `AGENTS.md` — don't apply these instructions there.

## Astro MCP

This project has the Astro Docs MCP server configured in `opencode.json`. Use it to query live Astro documentation — do not rely on stale training data for Astro APIs.

## Dev commands

```bash
npm run dev       # Start dev server (background when AI agent detected)
npm run build     # Production build
npm run preview   # Preview production build
```

## Security & Restriction Rules

### Basecamp Access Restriction
**CRITICAL:** Basecamp API access and CLI usage in this project must be restricted **only** to the VVF project (`ID: 43742602`). No other Basecamp projects, accounts, or buckets may be accessed, queried, or modified. This is enforced by:
- Always passing `-p 43742602` or `--project 43742602` explicitly.
- Relying on the project env variable `BASECAMP_PROJECT_ID` defaulting to `43742602`.
- Rejecting any attempt to read, create, update, or delete records in other projects/accounts.

## Basecamp ticketing

Requirements for this project come from cards on the VVF project's "Tareas" board in Basecamp (`basecamp cards list -p 43742602`, once authenticated via `basecamp auth login` — see README.md). Convention:

- Starting an openspec change to implement a specific card: put that card's Basecamp URL in the change's `proposal.md` (Why or Impact section).
- Archiving that change: run `basecamp cards done <id|url>` on the same card so it closes in Basecamp.

There's no automatic sync — both steps are manual, done by whoever is driving the change.

## Skills

- **astro** — Astro component syntax, content collections, integrations, and API patterns. Use when writing or modifying any Astro-specific code.

## Conventions

Full docs live in `docs-site/` ([`npm run dev` there](docs-site/src/content/docs/getting-started.md) to browse, or read the markdown source directly):

- [Architecture & Content Model](docs-site/src/content/docs/architecture.md) — EmDash content flow, the one-adapter rule, `seed/seed.json`
- [Component Library](docs-site/src/content/docs/components.md) — where components live, atomic-design tiers
- [Styling & Design Tokens](docs-site/src/content/docs/styling.md) — `tailwind.config.cjs` colors, type scale, radii, spacing
- [Testing & CI](docs-site/src/content/docs/testing-and-ci.md) — test suites, what runs in CI
