## Why

Enrique handed over the full VVF website specification (v0.27, `VVF_SiteSpec_Migration.md` on Google Drive, file id `1I-W2phZEY7ROl4f1V1gLCA6NM00mlvOQ`). He asked us to run it against our build and update what doesn't match. The spec is now the reference: where it and the build disagree, the spec wins. Basecamp card: https://app.basecamp.com/6025064/buckets/43742602/card_tables/cards/10392955622 ("VVF website spec: check your build against it").

The card has two steps. Step 1: read the spec from section 0, say how the build covers each section (or that it doesn't yet), and post questions on the card, each with its section number. Step 2, after Enrique answers: run every section's checks against the build in English and Spanish, and mark each one pass or fail, naming the section and check number (for example "7.8, check 3"). Spec section 0.3 says the list of failures is the work. This change also does that work: it fixes every failure that is clear, and asks Enrique how to proceed on the rest.

A first look already shows large gaps:
- Some routes differ: `/events` vs `/events-and-campaigns`, `/sponsor-a-child/children` vs `/children`, `/resources/category/{c}` vs `/resources/{c}`.
- Two paths that must never redirect (2.5) currently do: `/venezuela-earthquake-relief` and `/children/{slug}`.
- The thank-you pages, GTM, robots.txt and llms.txt are missing.
- Poppins still loads.
- The content model does not match Appendix B.

## What Changes

- **Step 1, coverage map.** A record of how the build covers each part of the spec, for sections 1 to 8 and Appendix B: covered, partly covered, not built, or conflicting. Each entry points to the files involved.
- **Step 1, questions.** One comment on the Basecamp card listing every unclear point, each with its spec section number. Where an answer could go more than one way, the question gives the options and our recommendation. Checks that depend on an answer wait for it. Nothing else does.
- **Step 2, conformance suite.** A Playwright suite, plus Vitest where a check is about data or config.
  - Each test is named after its spec check id (for example `7.8-3`).
  - It runs against the production build in both languages and can be run again after every fix.
  - Checks that cannot run locally are listed with the reason, for example Donorbox test gifts, GA4 conversions, delivered form emails, CMS-admin checks and validator.schema.org.
- **Step 2, report and triage.** A pass/fail/blocked table of every check in sections 2 to 8, plus the 4.4 migration content checks. Each fail names its section and check number, says what the build does instead, and is sorted into one of two groups:
  - **Straightforward:** the spec is unambiguous and the fix needs no outside input.
  - **Needs decision:** the spec is unclear or silent; it contradicts an earlier decision; it depends on access or a choice nobody has made yet (host, Donorbox, Figma, mail service); or it can't be undone beyond what the spec states.
- **Decision questions.** Every *needs decision* fail goes to Enrique on the card. Each one gives its check id, two or three workable options with their trade-offs, and our recommendation. Answers are recorded, and the chosen option is built.
- **Fixes.** Every straightforward fail is fixed in batches, in dependency order: routing and redirects, shared parts and design system, content model (to Appendix B, keeping existing CMS content and marketing's edits), pages, integrations. Each batch is committed on its own. A fix is done when its checks pass in both languages and the existing tests still pass.
- **BREAKING:**
  - **Public URLs change** to the spec's URL map (2.2), with one-step 301 redirects from every old path (2.6).
  - **CMS collections are restructured** to the content model in Appendix B. Existing content is migrated, and editors see new types and field names.
- **Regression guard.** Each check that passes joins the CI end-to-end run, so it stays passing.
- **Out of scope**, as the card instructs: spec 5.8 row 8 (button hover and focus) and section 9 (open questions).

## Capabilities

### New Capabilities
- `site-spec-conformance`: how the build is checked against, and brought up to, the VVF website specification.
  - Every spec check maps to one automated test or one documented manual or blocked step, keyed by section and check number. The suite runs both languages against the production build.
  - Results are reported as pass, fail or blocked. Each fail is triaged as straightforward or needs decision.
  - Decision questions, with their options and our recommendation, go to the linked Basecamp card.
  - Passing checks guard against regressions in CI.

### Modified Capabilities
These are the existing specs whose requirements the fixes will contradict. Each batch writes its delta spec before its code. They aren't written yet because the exact requirement text depends on the audit and on Enrique's answers.
- `front-end`: the route map and redirects (spec 2.2, 2.5, 2.6), the required page sections and SEO output (sections 6 and 7).
- `design-system`: the body font is Nunito, Poppins is removed, there is one page grey, and the type, spacing and radius tokens follow spec 5.1 to 5.4.
- `cms-collections`: collections and fields follow Appendix B (`event`, `event_offer`, `benefit_row`, `article`, `category`, `author`, `partner`, `site_fact`, …).
- `trust-pages`: Financials & Transparency and Our Programs follow 7.11 and 7.19.

## Impact

- **New files:**
  - `e2e/spec-audit/`: conformance tests by spec section, the check-id registry and helpers;
  - `playwright.spec-audit.config.ts`;
  - `scripts/spec-audit/report.mjs`;
  - new pages (thank-you pages, robots.txt, llms.txt, and more per the audit);
  - a content migration script for the Appendix B model.
- **Changed code:** `src/pages/**` (routes moved to the 2.2 paths), `src/lib/legacyRoutes.mjs` and `astro.config.mjs` (redirects), `src/layouts/Layout.astro` (fonts, GTM, hreflang), `src/components/**`, `src/lib/content/**`, `seed/seed.json`, `tailwind.config.cjs` and `src/index.css`, the copy manifests, and the docs in `docs-site/`.
- **Confidentiality:** the spec is marked "Confidential: internal and build use only", and `paulainc/vvf-astro` is a public repo. So the spec copy, the coverage map and the generated report stay in a gitignored local folder and go only to Basecamp. The registry and test titles in git hold check ids and our own short labels, never the spec's wording.
- **Existing tests:** tests that assert the old paths or behaviour are updated in the same batch as the fix that changes them. Conformance checks join `npm run test:e2e` only once they pass.
- **External:** Google Drive is read only, for the spec. The Basecamp card gets the Step 1 questions, the report with the decision questions, and a closing summary.
- **Dependencies:** none new expected. The audit uses the existing Playwright, Vitest and seed fixtures. If a decided option adds one (for example a mail provider), it is named in that decision.
- **Blocked areas:** no production host has been chosen yet. Checks that need a deployed site are reported as blocked, not failed: bare domain to `www`, Donorbox redirect-after-donation, GTM/GA4 traffic, email delivery.
