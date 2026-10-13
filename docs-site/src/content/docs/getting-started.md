---
title: Getting Started
description: Install, run, and develop the VVF Astro site locally.
---

## Stack

- [Astro](https://astro.build) 7, server output, `@astrojs/node` adapter
- [EmDash](https://docs.astro.build/en/guides/cms/emdash/) — self-hosted, database-backed CMS integration (SQLite locally)
- React (for EmDash's admin UI) + Tailwind CSS

## Install and run

### Option 1: Dev container (recommended)

Open the repo in a dev container-capable editor (VS Code, GitHub Codespaces) and reopen in container. It's pinned to Node 22, preinstalls Playwright's system dependencies, and runs `npm install` for both the root project and `docs-site/` on create — no manual install steps. Ports `4321` (site + EmDash admin) and `6006` (Storybook) are forwarded to the host automatically; `docs-site`'s own dev server also uses `4321`.

```bash
npm run dev
```

### Option 2: Manual setup

```bash
npm install
npm run dev
```

This starts the site at `http://localhost:4321` and the EmDash admin at `http://localhost:4321/_emdash/admin`.

On first run, EmDash creates a local `data.db` and seeds it from [`seed/seed.json`](https://github.com/anclist/vvf-astro/blob/main/seed/seed.json) — the site's content schema (collections + fields) and starter content, both version-controlled. `data.db`, `.emdash/`, and `/uploads` are local/generated and gitignored; nothing about them needs to be committed.

## Basecamp CLI

Requirements for this project are tracked as cards on the VVF project's "Tareas" board in Basecamp, worked through as openspec changes. To connect:

```bash
curl -fsSL https://basecamp.com/install-cli | bash   # already run automatically in the dev container
basecamp auth login                                  # one-time, opens a browser to approve
```

Once authenticated, `basecamp cards list -p 43742602` lists VVF's cards. When an openspec change implements a specific card, its `proposal.md` links to that card's Basecamp URL; archiving the change closes the loop with `basecamp cards done <id|url>`.

In the dev container (no OS keyring available), the CLI stores credentials in plaintext at `~/.config/basecamp/credentials.json` — outside the repo, but treat that file as a secret on shared/ephemeral containers.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server at `localhost:4321` |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run seed` | Rebuild the local database from the seed (asks first: it deletes `data.db` and `uploads/`; `-- --yes` skips the question) |
| `npm run verify-menu` | Check nav menu URLs in `seed/seed.json` against real routes |
| `npm run storybook` | Storybook dev server at `localhost:6006` |
| `npm run build-storybook` | Static Storybook build |
| `npm run test` | Full suite: unit → Storybook → e2e, in order |
| `npm run test:unit` | Vitest, `src/**/*.test.ts` |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:storybook` | Boots Storybook, runs `@storybook/test-runner` against it |
| `npm run test:e2e` | Playwright, `e2e/**` |

See [Testing & CI](/testing-and-ci/) for details on the test suites.

## Environment

No environment variables are required for local dev — see `.env.example`. Production deploy target (hosting, database, media storage) has not been decided yet; local dev uses SQLite and local disk.

## Project structure

```
src/
  pages/          Astro pages/routes
  components/     Astro components (flat directory — see Component Library)
  layouts/        Page layout + shared chrome
  lib/content/    Content adapter + normalized types (see Architecture)
  lib/donorbox.ts Donorbox embed/link helpers
seed/seed.json    EmDash schema + seed content (source of truth for content)
public/           Static assets
docs-site/        This documentation site (Astro Starlight, standalone project)
```
