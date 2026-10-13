## Context

See proposal.md. The site already has: copy slots per page (`_copy.ts`, Spanish from live `/es` pages via `npm run migrate:copy`), locale fallback in the content adapter, and a library of section components mirrored from the live site. `/financials-and-transparency` currently redirects to `/resources/category/financials-transparency`. The live Webflow `testimonials` collection exists but is empty. The Our Programs designs (desktop and phone PDFs, older site chrome) include embedded photos; the current site header and footer are used instead of the ones drawn in the designs.

## Goals / Non-Goals

**Goals:** both pages built from existing components, fully slot-driven, bilingual where a source exists, with report lists and testimonials coming from collections.

**Non-Goals:** the designs' header and footer variants; publishing the design's placeholder testimonials; a Spanish translation of Our Programs (no live source — marketing translates it through the CMS).

## Decisions

### Section → component mapping
| Page section | Component |
| --- | --- |
| Both heroes | `Hero` (desktop + phone images) |
| Financials "Give with Confidence" | `MediaSplit` (tagline, heading, text, two points, two links via its actions) |
| Financials "Where your donation goes", Programs global goals | `ImpactBanner` (gains an optional second action) |
| Financials board | `SectionTitle` + the Our Team page's board cards |
| Contact / support calls to action | `ProgramsCta` |
| Programs "How we work together" | `SectionTitle` (left) beside the quote and actions |
| Programs nutrition / medical / education | `MediaSplit` with a new `card` option: the photo inside a pastel card with a caption title and text |
| Programs testimonials | `TestimonialCarousel` fed by the `testimonials` collection; section omitted when empty |
| Programs "Dig deeper" | `SectionTitle` + three photo cards (`Card` composition) |
| Financials report lists | new `ReportList` (date, title, summary, Read, Download) |

New variants are additive props with today's rendering as the default, so existing pages don't change.

### Report kind as a field
Report lists filter `resources` by a new optional `report_kind` (`annual` / `quarterly`) rather than by title or slug, so editors control what appears. The migration sets it from the live slugs (`*-report-*` → annual, `your-impact-*` → quarterly).
*Alternative:* derive from slug — rejected, brittle for new reports.

### Testimonials are content, not copy slots
Quotes belong to people and need consent; they're items in a `testimonials` collection (quote, name, role, photo), not page copy. The section reads it and renders nothing when empty.

### Spanish
Financials copy is translated from the live `/es/financials-and-transparency` page by the existing copy step (the page is added to the aligned pages). Our Programs has no live Spanish page; its Spanish slots stay empty and fall back to English, and `/es/our-programs` canonicalizes to English until translated.

### Images
Programs photos are taken from the design PDF, resized and converted to WebP under `public/images/pages/programs-*`; the "Understand Venezuela's struggle" card, which has a placeholder in the design, uses an existing earthquake relief photo. Financials images are harvested from the live page like the other migrated pages.

## Risks / Trade-offs

- [Program statistics need a source] → each one names it (World Health Organization, United Nations, UNICEF), copied from the live site; they are copy slots, editable without a deploy.
- [Design photos from a PDF may be lower quality than originals] → resized from the embedded originals (up to 4096px); swap for source files when available.
- [The live hero button reads "Primary" (a Webflow placeholder)] → use "Donate" and note the difference.
