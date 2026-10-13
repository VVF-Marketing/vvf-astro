# Victoria Venezuela Foundation

Marketing site for Victoria Venezuela Foundation — a nonprofit connecting US donors with children and communities in Venezuela through sponsorship, events, and relief campaigns.

## Stack

- [Astro](https://astro.build) 7, server output, `@astrojs/node` adapter
- [EmDash](https://docs.astro.build/en/guides/cms/emdash/) — self-hosted, database-backed CMS integration (SQLite locally)
- React (for EmDash's admin UI) + Tailwind CSS

## Getting started

### Option 1: Dev container (recommended)

Open the repo in a dev container-capable editor (VS Code, GitHub Codespaces) and reopen in container. It preinstalls Node 22, Playwright's system dependencies, and runs `npm install` for both the root project and `docs-site/` on create. Ports `4321` (site + EmDash admin) and `6006` (Storybook) are forwarded to the host automatically.

```bash
npm run dev
```

### Option 2: Manual setup

```bash
npm install
npm run dev
```

This starts the site at `http://localhost:4321` and the EmDash admin at `http://localhost:4321/_emdash/admin`.

**Staff: content admin.** In any deployed environment, the same admin UI is available at `<site-url>/_emdash/admin` — it requires login (EmDash's built-in session auth; unauthenticated requests redirect to `/_emdash/admin/login`). The sidebar groups collections into three folders: **Pages & SEO** (one entry per page with its text and SEO, plus shared and site-wide text), **CMS collections** (events, blog posts, resources…) and **Banner** (the site banner). The layout comes from `src/lib/cmsNavigation.mjs`; apply it to an existing CMS with `npm run cms:schema` (see [Localization & Page Copy](docs-site/src/content/docs/localization-and-copy.md)). Each list shows every entry's draft/published/scheduled status.

The `pages` collection (hidden from the sidebar) lists every static route that isn't already covered by another collection (home, contact, privacy policy, etc.), and each page's copy collection holds its declared text slots; both keep themselves in sync automatically on the first request after the server starts — no one adds entries by hand. One-time setup per environment: generate a personal access token via the admin UI's token/API settings (name it `static-page-sync`, scopes `content:read` + `content:write`) and set it as `EMDASH_SYNC_PAT` (see `.env.example`).

On first run, EmDash creates a local `data.db` and seeds it from [`seed/seed.json`](seed/seed.json) — the site's content schema (collections + fields) and starter content, both version-controlled. `data.db`, `.emdash/`, and `/uploads` are local/generated and gitignored; nothing about them needs to be committed.

## Basecamp CLI

Requirements for this project are tracked as cards on the VVF project's "Tareas" board in Basecamp, worked through as openspec changes. To connect:

```bash
curl -fsSL https://basecamp.com/install-cli | bash   # already run automatically in the dev container
basecamp auth login                                  # one-time, opens a browser to approve
```

Once authenticated, `basecamp cards list -p 43742602` lists VVF's cards. When an openspec change implements a specific card, its `proposal.md` links to that card's Basecamp URL; archiving the change closes the loop with `basecamp cards done <id|url>`.

In the dev container (no OS keyring available), the CLI stores credentials in plaintext at `~/.config/basecamp/credentials.json` — outside the repo, but treat that file as a secret on shared/ephemeral containers.

## Docs

Full docs (scripts, content model, component library, testing & CI) live in `docs-site/`:

```bash
cd docs-site
npm install
npm run dev
```

Or read the markdown source directly under `docs-site/src/content/docs/`.

## Tooling

- `openspec/` — OpenSpec change proposals and specs for this project
- `.claude/`, `.opencode/` — AI assistant commands/skills used while building this project
