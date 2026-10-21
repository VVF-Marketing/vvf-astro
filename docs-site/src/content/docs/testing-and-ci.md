---
title: Testing & CI
description: How to run the test suites and what runs in CI on every PR.
---

## Test suites

| Command | Runs |
| --- | --- |
| `npm run test:unit` | Vitest against `src/**/*.test.ts` and `scripts/**/*.test.mjs` (node environment) |
| `npm run test:storybook` | Boots Storybook on port 6006 via `start-server-and-test`, then runs `@storybook/test-runner` against it |
| `npm run test:e2e` | Playwright against `e2e/**` (chromium only, `baseURL http://localhost:4321`) |
| `npm run test` | All three, in order: unit → Storybook → e2e |

Before `test:e2e` runs, `pretest:e2e` wipes `data.db*`, reseeds from `seed/seed.json`, and rebuilds the site — Playwright always runs against a fresh, known content state. Because that deletes the local database, `npm run seed` asks first in a terminal (CI proceeds on its own); run `npm run seed -- --yes && npm run build && npx playwright test` to skip the question.

The unit suite also guards the repository's size: `scripts/repo-size.test.mjs` fails when a committed binary (image, PDF, font…) passes 8 MB or all of them together pass 80 MB. Media stays in git while it's small; when the check fails, compress the file or revisit moving media to Git LFS or object storage.

## Spec conformance audit

VVF's website specification (Paula Inc., kept in Google Drive) numbers the checks the site must pass. The audit runs every one of them, in English and Spanish, and reports each as pass, fail, blocked or manual (openspec change `audit-build-against-site-spec`).

| Command | Does |
| --- | --- |
| `npm run test:spec-audit` | Vitest (`vitest.spec-audit.config.ts`, the content-model checks in `e2e/spec-audit/*.audit.ts`), then Playwright (`playwright.spec-audit.config.ts`, port 4393) against the built site. Run `npm run seed -- --yes && npm run build` first. |
| `npm run spec-audit:report` | Joins the results with the check registry into `.spec-audit/report.md` and `report.json`. |

- **Registry.** `e2e/spec-audit/registry.ts` lists every numbered check, keyed `<section>-<check>` (e.g. `7.8-3`), with how it's verified (`auto`, `manual`, `blocked`), the batch it was fixed in, and the question on the Basecamp card it waits on. Its labels are our own wording, never the spec's. Each test is titled `[7.8-3] en /path`.
- **`/.spec-audit/` is gitignored.** The spec is confidential and this repository is public, so the spec copy, the coverage map, the questions, the manual results (`manual.json`), the answers (`answers.json`) and the reports stay out of git.
- **What the audit run changes.** It starts the server with `GTM_CONTAINER_ID` set, so the Tag Manager check sees the production snippet, and cuts the font, video and tag hosts in the browser, so pages don't wait on them and tests never reach VVF's analytics. Donorbox and Double the Donation stay reachable for the widget checks.
- **Conformant checks in CI.** A check that passes in both languages is marked `conformant: true` in the registry; its tests are tagged `@conformant` and run in the default Playwright config's `conformant` project, so `npm run test:e2e` and CI catch a regression. Checks that need child data run in CI against made-up children: the public seed has none, so the `e2e` job seeds with `SEED_FIXTURE_CHILDREN=1`, which adds six fictional profiles ("Alfa T." to "Foxtrot T.", `scripts/lib/fixture-children.mjs`) to the gitignored local seed. They're never added when real children are present, and never by `db:setup`, so the `container` job (the deploy path) still has none. The same job sets `SEED_FIXTURE_EVENTS=1`, which adds one made-up upcoming event with closed registration (`fixture-closed-registration`, `scripts/lib/fixture-events.mjs`), so the closed-registration check (7.8-2) runs instead of skipping. Checks that need a third-party service or a production setting stay out.
- **A new spec version.** Save the new copy as `.spec-audit/spec-v<version>.md` and set `SPEC_VERSION` in the registry. `e2e/spec-audit/registry.audit.ts` then fails until the registry lists exactly the new version's checks: add the new ones (with tests, or as manual or blocked with a reason) and drop the removed ones.

## What CI runs

Two workflows, both on PR to `main` and push to `main`, Node 22, `npm ci`:

- **[`test.yml`](https://github.com/anclist/vvf-astro/blob/main/.github/workflows/test.yml)** — parallel jobs: `unit` (`npm run test:unit`), `storybook` (installs Playwright chromium, `npm run test:storybook`), `e2e` (installs Playwright chromium, `npm run test:e2e`), and `container`, which builds the site image, seeds Postgres with the public seed, runs the image against Postgres + SeaweedFS and points the e2e suite at it (`playwright.container.config.ts`). It also runs `scripts/data.integration.test.mjs` with `TEST_POSTGRES_URL`, so `data:export` / `data:import` round-trip the seeded site SQLite -> Postgres -> SQLite (the `unit` job runs its SQLite-only part). That catches database differences SQLite hides. `npm run db:setup` seeds the public media into the bucket, so the whole suite runs there; see [Running Anywhere](/running-anywhere/).
- **[`verify-menu-links.yml`](https://github.com/anclist/vvf-astro/blob/main/.github/workflows/verify-menu-links.yml)** — runs `scripts/verify-menu-links.mjs`, which checks `seed/seed.json`'s nav menu URLs against real routes.

`test.yml` also has a `docs-build` job that builds this documentation site (`docs-site/`) — a build-only check, no deploy, to catch broken frontmatter or links before merge.

No deploy/publish workflow exists yet for the main site, matching its undecided production target.
