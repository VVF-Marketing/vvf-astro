## 1. Report list

- [x] 1.1 In `src/components/ReportList.astro`, render each date as `<Badge class="mb-2"><time datetime="YYYY-MM-DD">…</time></Badge>` (D1, D2) and remove the `bg-[#eee]` markup. Verify that `grep -rn 'bg-\[#' src/components src/pages` finds nothing and `astro build` passes.

## 2. Verification

- [x] 2.1 e2e in `e2e/trust-pages.spec.ts`. On `/financials-and-transparency` and `/es/financials-and-transparency`, the first annual and first quarterly date have:
  - background `rgb(231, 231, 231)`, a 4px border radius, a Nunito font family, 14px text, 4px 8px padding;
  - a `time[datetime]` matching `YYYY-MM-DD`.

  The same computed style as an event card's date badge on `/events`. Verify against the built site.
- [x] 2.2 Take before and after screenshots of the annual and quarterly report cards at 1440px and 390px. Confirm the only differences are the badge's grey, corners and font, and attach them to the PR.
- [x] 2.3 Add a note to `docs-site/src/content/docs/components.md` that small grey labels (event dates, categories, report dates) use the default `Badge`. Run the docs build, unit tests, Storybook tests (`ReportList` story) and e2e, and report the results.
