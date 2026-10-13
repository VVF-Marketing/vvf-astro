---
title: Testing & CI
description: How to run the test suites and what runs in CI on every PR.
---

## Test suites

| Command | Runs |
| --- | --- |
| `npm run test:unit` | Vitest against `src/**/*.test.ts` (node environment) |
| `npm run test:storybook` | Boots Storybook on port 6006 via `start-server-and-test`, then runs `@storybook/test-runner` against it |
| `npm run test:e2e` | Playwright against `e2e/**` (chromium only, `baseURL http://localhost:4321`) |
| `npm run test` | All three, in order: unit → Storybook → e2e |

Before `test:e2e` runs, `pretest:e2e` wipes `data.db*`, reseeds from `seed/seed.json`, and rebuilds the site — Playwright always runs against a fresh, known content state.

## What CI runs

Two workflows, both on PR to `main` and push to `main`, Node 22, `npm ci`:

- **[`test.yml`](https://github.com/anclist/vvf-astro/blob/main/.github/workflows/test.yml)** — parallel jobs: `unit` (`npm run test:unit`), `storybook` (installs Playwright chromium, `npm run test:storybook`), `e2e` (installs Playwright chromium, `npm run test:e2e`), and `container`, which builds the site image, seeds Postgres with the public seed, runs the image against Postgres + SeaweedFS and points the e2e suite at it (`playwright.container.config.ts`). It also runs `scripts/data.integration.test.mjs` with `TEST_POSTGRES_URL`, so `data:export` / `data:import` round-trip the seeded site SQLite -> Postgres -> SQLite (the `unit` job runs its SQLite-only part). That catches database differences SQLite hides. It skips the two tests that need seeded media files; see [Running Anywhere](/running-anywhere/).
- **[`verify-menu-links.yml`](https://github.com/anclist/vvf-astro/blob/main/.github/workflows/verify-menu-links.yml)** — runs `scripts/verify-menu-links.mjs`, which checks `seed/seed.json`'s nav menu URLs against real routes.

`test.yml` also has a `docs-build` job that builds this documentation site (`docs-site/`) — a build-only check, no deploy, to catch broken frontmatter or links before merge.

No deploy/publish workflow exists yet for the main site, matching its undecided production target.
