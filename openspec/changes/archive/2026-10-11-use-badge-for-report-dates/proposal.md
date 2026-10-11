## Why

The report dates on `/financials-and-transparency` (annual and quarterly report cards in `ReportList`) are one-off markup: a `<p>` with a hard-coded `bg-[#eee]` and square corners. They don't use the `Badge` atom the rest of the site uses for small grey labels (event dates, resource categories), and they break the project rule of using tokens instead of hex codes. It's the only hard-coded hex utility left in `src/components`.

The team wants report dates to look like every other badge on the site: the default `Badge`, with its rounded corners.

## What Changes

- **`ReportList` renders each date as the default `<Badge>`**, wrapping a `<time datetime>` so the date is also machine-readable. The `bg-[#eee]` markup is removed.
- **Visible result:** the dates now match the site's other badges:

  | | Before (copied from live `.fin_report-date`) | After (default `Badge`, like live `.tag_component`) |
  |---|---|---|
  | Background | `#eee` | `#e7e7e7` (`neutral-light-gray`) |
  | Corners | square | 4px radius |
  | Font | Open Sans | Nunito |
  | Size, padding, colour | 14px, 4px 8px, navy | unchanged |

  This deliberately departs from the live financials page, for consistency across the site.
- **No change to `Badge` itself**, and no new tokens.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `component-library`: adds a "Badge for small labels" requirement. Report dates use the default badge like event dates and resource categories, and components don't hand-roll badge styles.

## Impact

- **Code:** `src/components/ReportList.astro` only.
- **Visual:** report dates on `/financials-and-transparency` (both locales) get rounded corners, a slightly darker grey and the Nunito font.
- **Tests:** an e2e check of the date's computed style and `datetime`; the existing Storybook story for `ReportList`.
- **Docs:** a note in `components.md`.
- **Stack:** PR 12, based on `stack/11-external-links` (#23).
