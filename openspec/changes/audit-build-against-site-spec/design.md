## Context

See proposal.md for why this change exists. The facts below shape how the audit is built.

- **The spec.** `VVF_SiteSpec_Migration.md` v0.27 is about 2,900 lines of markdown on Google Drive, and the Drive connector can download it. It has about 112 numbered checks: 2.8 (10), 3.4 (4), 4.5 (8), 5.9 (10), 6.4 (4), 7.1 to 7.19 (between 1 and 7 per page; 7.18 has none), 8.9 (10), plus 4 migration content checks in 4.4. Appendix B, the content model in YAML, wins over the section 4 tables.
- **Confidentiality.** The spec is marked confidential, and `paulainc/vvf-astro` is public (checked with `gh repo view`). See the spec's confidentiality requirement.
- **Test setup today.** `playwright.config.ts` runs `e2e/` against `node ./dist/server/entry.mjs` on port 4321 after `npm run seed && npm run build`. `e2e/fixtures.ts` reads the seed, and children exist only in the gitignored `seed/seed.local.json`. A separate parity config (`playwright.parity.config.ts`) already shows the pattern for an opt-in suite.
- **What a first look found.** This is not the coverage map. It shows the scale of the gaps and seeds Step 1:
  - Routes differ from 2.2: `/events` (target `/events-and-campaigns`), `/sponsor-a-child/children[/slug]` (target `/children[/slug]`), `/resources/category/{c}` (target `/resources/{c}`), `/earthquake-relief` (target `/venezuela-earthquake-relief`). There is an extra `/blog` route the spec doesn't list.
  - `src/lib/legacyRoutes.mjs` redirects `/venezuela-earthquake-relief` and `/children/{slug}`, two paths 2.5 says must answer 200 with no redirect.
  - There are no thank-you pages (7.17), no GTM snippet (8.3), and no `robots.txt` or `llms.txt` route (2.4).
  - `Layout.astro` loads Poppins (5.2 and 5.9-3 allow Nunito and Open Sans only). Its hreflang output depends on per-page `alternates`.
  - `/sitemap.xml` leaves out child profiles on purpose (earlier review follow-up), but 2.4 says children are indexable by decision.
  - The EmDash collections (`events`, `children`, `team_members`, `posts`, `resources`, `sponsors`, `sponsorship_packages`, `faqs`, …) don't match Appendix B's types (`event`, `event_offer`, `benefit_row`, `article`, `category`, `author`, `partner`, `site_fact`, …).
  - The `design-system` spec makes Open Sans the paragraph font and keeps Poppins for the benefits table. Spec 5.2 and 5.8 row 2 make Nunito the body font. The build conflicts with the spec here.
- **No host.** No production host has been chosen (see the hosting card), so anything that needs a deployed domain, Donorbox redirects, GTM traffic or delivered email can't run yet.

## Goals / Non-Goals

**Goals:**
- Every spec check gets a result that is traceable and can be repeated.
- The suite tests the spec's target behaviour (its URLs, labels and rules), not what the build does today. A missing route is a fail, not a skip.
- Running it again after each fix is cheap, and each fix shows up as checks turning green.
- Every straightforward fail gets fixed, and every fail that needs a decision gets one clear question with workable options.

**Non-Goals:**
- Guessing on any fail that needs a decision. Nothing is built for it until Enrique answers.
- Checking copy word for word against the live site (6.1 rule 1 and 7.16). That needs the live-site scrape. The existing parity and migrate tooling covers it, and the registry marks those checks manual.
- Building 5.8 row 8 or anything in section 9.

## Decisions

### D1. Confidential material lives in `/.spec-audit/` (gitignored)
`/.spec-audit/` holds `spec-v0.27.md` (downloaded from Drive), `coverage.md` (Step 1 map), `questions.md` (draft card comment), `results.json` (Playwright JSON output) and `report.md`. Git holds only the registry, the tests and the scripts.
*Alternatives:* committing the map to the change folder is simpler, but it would publish the spec's structure and wording in a public repo. A private gist or Drive doc adds a second place to look. Basecamp is already where the results go.

### D2. Registry as a typed module, checked against the local spec copy
`e2e/spec-audit/registry.ts` exports `SPEC_VERSION` and a list of `{ id: '7.8-3', label, verify: 'auto' | 'manual' | 'blocked', file?, reason?, question?, triage?: 'straightforward' | 'decision', batch?, conformant?: boolean }`. A Vitest test (`registry.test.ts`) parses `/.spec-audit/spec-v*.md` when it is there: it finds each `Checks` block and numbered item, plus the 4.4 content checks, and asserts that the ids match one to one. When the file is missing (as in CI), the test skips with a message.
*Alternative:* generating the registry from the spec at run time would put the wording in the output and break offline. A typed module also lets tests import their own entries.

### D3. Separate Playwright config, one test per check per language
`playwright.spec-audit.config.ts` uses `testDir: e2e/spec-audit` and the same `webServer` command on port 4393, so it doesn't fight a running dev server. It adds a JSON reporter writing to `/.spec-audit/results.json`, and the npm script is `test:spec-audit`. A helper, `bilingual(id, enPath, fn)`, makes the tests `[7.14-1] en` and `[7.14-1] es`. The report counts a check as passing only when both pass. Once the check passes it is tagged `@conformant` and also runs in CI (D15). Checks that don't depend on language (for example 2.8-8 and 5.9-2) make a single test.
*Alternative:* one test that loops over both languages would hide which language failed and stop at the first failure.

### D4. Test the target paths from the spec
Tests call the spec's URLs (`/events-and-campaigns`, `/children/{slug}`, `/resources/stories` …) and its labels. Fixtures come from the seed through `e2e/fixtures.ts`. If an item type doesn't exist in our model, the check fails with "no such content type". Children checks need `seed.local.json`. Without it they are reported as blocked ("child data not available in this environment"), which keeps CI honest.

### D5. Checks that depend on content state run at the data layer where they can
Some checks need a variation in content: "with two upcoming featured events", "a child switched to sponsored", "seven past events", "a newer annual report". These are tested in two parts:
- (a) a Vitest test of the selection logic in `src/lib/content` with items we build in the test;
- (b) one Playwright smoke test showing the page uses that logic.

When the build has no such logic (for example no `lifecycle` field), the check fails at (a). We don't write to the CMS during the audit, because writes need a throwaway database and `npm run seed` wipes tokens.
*Alternative:* driving the EmDash admin API per test is more realistic, but slow, stateful and fragile with the seed-reset gotchas.

### D6. Static analysis for build-wide checks
- 5.9-2 (colours): scan the CSS in `dist/client/**` for colour literals and compare them to the 5.1 palette.
- 5.9-3 (fonts): record font requests in the browser and also check the font links in the head.
- 5.9-10 (repeated ids): a DOM query on every page.
- 2.8-4 (no English links on Spanish pages): crawl every Spanish page from the 2.2 list.
- 5.9-1 and 5.9-9 (no sideways scroll, no wrapped button labels): every page at 1440, 1280, 768, 440 and 375 px in both languages. They run in a separate Playwright project, `layout`, because they are the slow ones.

### D7. Manual and blocked checks have written steps
Each manual or blocked entry carries `reason` and `steps`. Examples: 2.8-8 (CMS refuses reserved slugs; manual in the admin), 4.5-2 (publishing is blocked until Spanish is complete), 7.1-6, 7.8-5 and 7.13-4 (validator.schema.org), 7.17-3 and 8.9-1 (Donorbox test gift and GTM), 7.8-6 (reminder email), 8.9-2, 8.9-3 and 8.9-7 (live network and email). Wherever a local proxy exists, the auto test still runs it. For example, the suite asserts that the GTM snippet appears exactly once in the HTML, while the GA4 request check stays blocked until there is a host.

### D8. Report generator joins registry and results
`scripts/spec-audit/report.mjs` reads the registry (through a small JSON export step, or by importing the TS through `tsx`, whichever works with the repo's current tooling), `results.json`, `git rev-parse HEAD` and the date. It writes `/.spec-audit/report.md`:
- totals per section;
- a table of every check with its status (pass, fail, blocked, manual-pending), the languages that fail, and the first line of the assertion error as "what the build does instead";
- the blocked list with reasons;
- each fail's triage group and reason (D11), and its batch.

Manual results are recorded by hand in `/.spec-audit/manual.json` (`{ id: 'pass' | 'fail', note }`) and merged in.

### D9. Coverage map is filled by reading, not by tests
Step 1 is a structured read. For each spec subsection, the map gives a status (covered, partial, not built, conflict, out of scope), the build files and collections involved, and a one-line note. It is written before the suite, because it is what produces the questions, and the answers can change which checks are blocked.

### D10. Basecamp posts are drafted and reviewed before posting
`questions.md` and the summary of `report.md` are shown to the user first, then posted with `basecamp comments create` (or the CLI's equivalent) on card `10392955622`. The card is in English, so the comments are too. Each question leads with its section number, as the card asks.

### D11. Triage rule, applied per failed check
Each fail gets `triage` and a one-line reason in the registry and the report, using the test in the spec's triage requirement. In practice:
- **Straightforward:** the spec gives a concrete target such as a path, a label, a status code, a token value, a heading level, a field or a show/hide rule, and the fix is ours alone. Size doesn't matter. The Appendix B content model and the URL restructure count as straightforward because the spec states them exactly (user decision, 2026-10-12).
- **Needs decision:** at least one of these holds:
  - **Earlier decision:** the spec contradicts something we decided before. It names that decision (an existing project spec, an Eduardo or Enrique review, a memory note).
  - **Outside input:** the fix needs something we don't have, such as a host, a Donorbox setting, Figma, the M.O. doc, a mail provider or a GTM environment choice.
  - **Ambiguity:** the spec is ambiguous or silent on the point.
  - **Data loss:** the fix would delete data beyond what the spec states.

First-look triage. It seeds Step 1 and is confirmed after the run:

| Item | Spec | Group | Why |
| --- | --- | --- | --- |
| Route map and one-step 301s; 2.5 paths answer 200 | 2.2, 2.5, 2.6 | straightforward | exact paths given |
| Thank-you pages, noindex, no inbound links | 7.17, 2.4 | straightforward | layout and rules given |
| robots.txt, llms.txt, `lang`, hreflang + x-default | 2.1, 2.4 | straightforward | |
| Nunito body, drop Poppins, one page grey, token values | 5.1–5.4 | straightforward | explicit; supersedes the `design-system` spec |
| Content model to Appendix B, with migration | 4, App. B | straightforward | "Appendix B wins" |
| Child profiles in sitemap | 2.4 | decision | earlier review follow-up excluded them on purpose |
| `/blog` route | 3.3 | decision | not in the spec; drop it, redirect it, or keep it? |
| `private_full_name`, Donorbox ref on `child` | 4.3 | decision | "show only these fields, add none" vs internal-only fields |
| Block publishing until Spanish is complete | 4.5-2 | decision | EmDash has no built-in gate: plugin hook vs editorial rule |
| Recap reminder email | 7.8 | decision | needs a mail provider and a scheduler; no host yet |
| Form email delivery | 8.4 | decision | mail service not chosen |
| Carry over Webflow's 301 list | 2.6 | decision | needs the export from Webflow settings |
| Child list filters, child "What sponsorship provides" block | 7.3, 7.4 | decision | approved design not in our hands (Figma / M.O.) |
| GTM outside production | 8.3 | decision | staging traffic would pollute GA4 unless filtered |

### D12. Decision question format
Decision questions known from the coverage map go in the Step 1 questions comment. New ones found in the run go in the report comment. Each question looks like this:

> **7.8 · check 6, recap reminder email.** The spec wants an email to info@ two working days after an event while it is still "upcoming". Blocked by: no mail provider or scheduler yet.
> - **A.** Resend (free tier) plus a daily job on the host's scheduler. *About 2 h; needs the host decision.*
> - **B.** A reminder shown in the CMS dashboard instead of an email. *About 1 h; nothing new, but someone must open the admin.*
> - **C.** Postpone until hosting is chosen. *No work now; the check stays blocked.*
> - **Recommended: B now, A after hosting.**

Each option is something we can build. Answers go into `/.spec-audit/questions.md` with the date, and the item's registry entry moves to `triage: 'straightforward'` with the chosen option recorded.

### D13. Fix batches in dependency order
Every test targets the spec's URLs, so routes come first. Each batch:
1. writes the delta spec for each existing capability it changes;
2. makes the code change;
3. updates any old test that asserted the replaced behaviour;
4. reruns the conformance suite and the existing suites;
5. marks the checks that now pass as `conformant`;
6. is committed on its own.

The user can stop after any batch.

| Batch | Covers | Main files | Delta specs |
| --- | --- | --- | --- |
| A. Routing and indexing | 2.x, 3.x, thank-you pages, robots, llms, sitemap | `src/pages/**` moves, `legacyRoutes.mjs`, `astro.config.mjs`, `middleware.ts`, `sitemap.ts` | `front-end`, `site-migration` |
| B. Shared parts and design system | 5.x (not row 8), 6.x | `tailwind.config.cjs`, `index.css`, `Layout.astro`, Header, Footer, `Button` and the component merges in 5.5 | `design-system`, `component-library` |
| C. Content model | 4.x, Appendix B | EmDash collections in `seed/seed.json`, `src/lib/content/**`, migration script, seed regeneration | `cms-collections` |
| D. Pages | 7.1 to 7.19 | page modules and copy manifests, per page | `front-end`, `trust-pages` |
| E. Integrations | 8.x | GTM in `Layout.astro`, Donorbox settings (campaign ids as site settings), forms, Double the Donation | `front-end` |
| F. Decided items | whatever Enrique chose | per item | per item |

The batches are large, so batches C and D are split into sub-batches, one per type or page, each committed on its own.

### D14. The content model changes in the migration transform
No deployed CMS exists yet (no host is chosen), and `npm run seed` rebuilds `seed/seed.json` from the Webflow snapshot through `migrate:transform` every time. So batch C changes the mappers and the transform to emit the Appendix B types directly; patching the seed by hand would be overwritten by the next seed run. The transform keeps the snapshot's content in both languages (4.4, content check 1). It reports empty Spanish fields as gaps. Before and after, it counts items per type.

A script that converts an existing EmDash database is only needed if a deployed CMS exists before launch. If one does, it becomes a follow-up task (user decision, 2026-10-12).
*Alternative:* the D14 first planned, a one-off migration of live CMS data. It assumed edits in a deployed CMS that doesn't exist.

### D15. Conformant checks join CI
Checks that pass get `conformant: true` in the registry. `playwright.config.ts` adds `e2e/spec-audit` with a grep for the `@conformant` tag, which the `bilingual` helper puts on titles from the registry flag. So `npm run test:e2e` and the CI job run exactly the conformant set. Children checks stay local, because CI has no child data (D4).

## Risks / Trade-offs

- [Spec version moves on while we work, since v0.27 is a living document] → Every artifact records `SPEC_VERSION`. Before each batch, check Drive for a newer version. If there is one, re-download it, rerun `registry.test.ts` and note the changes in the next card comment.
- [Tests written against target URLs fail all at once, which hides finer gaps] → Batch A goes first, so later results show real gaps. The report's "what the build does instead" line separates "route missing" from real behaviour fails.
- [Data-layer tests (D5) can pass while the page doesn't use that logic] → Each D5 check also has a page smoke test, and the report counts the check as passed only when both pass.
- [Children checks are blocked in CI] → They run locally with `seed.local.json`, and the report says which environment produced each result.
- [Unanswered questions stall the work] → Only items tied to a question wait. Every straightforward batch goes ahead.
- [The change becomes very large] → Each batch is committed on its own and verified by the checks it turns green. The user can stop or split after any batch, and a remaining batch can move to its own change without rework.
- [URL moves break shared links] → Every old path gets a one-step 301 in both languages (2.6), and 2.8-5 and 2.8-7 verify it. The thank-you paths and the other 2.5 paths never redirect.
- [The content model change loses content] → The transform reports per-type counts before and after, and lists Spanish gaps. Every page and test is run against the regenerated seed.
- [Existing project specs drift from the code] → Each batch writes its delta specs before its code, and archiving the change syncs them.

## Open Questions

- Will Enrique share the M.O. decisions document and Figma access (5.5 and 5.8 cite node ids, and 7.3 and 7.4 cite approved designs that aren't built)? This only changes how much of 5.x and 7.x is manual, not the plan. It goes into the Step 1 questions.
