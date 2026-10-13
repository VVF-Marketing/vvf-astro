## 1. Spike and configuration

- [x] 1.1 Spike D3: check how the admin list renders a `dateField` used for ordering. Outcome: the Date column would show synthetic dates, so D3 switches to numbered titles sorted by the Title column (confirmed with the user); design.md updated.
- [x] 1.2 Add `src/lib/cmsNavigation.mjs` with folders, the ordered copy-page list (route, name, description), content collection settings (labels, descriptions, group, sortOrder, listColumns, hidden `pages`) and `copyCollectionFor(route)`. Verify with unit tests: slugs are valid and unique, and every manifest has exactly one copy-page entry and vice versa.
- [x] 1.3 Add a unit test that every collection in `seed/seed.json` is in a folder or hidden, and that the three folders appear in order. Verify it fails when a collection is removed from the config.

## 2. Copy storage and reads

- [x] 2.1 Define the copy collection field set (D2: key, label, title, section, position, format, max_length, value, rich_value, image_value, stale) in one shared definition used by the seed and the schema script. Verify with a unit test that only the value fields are translatable.
- [x] 2.2 Switch `getPageCopy` / `storedSlots` to read the page's copy collection, returning no rows when it's missing. Verify by updating `src/lib/content/index.test.ts`: fallback order, `locales`, a missing collection renders defaults.

## 3. Sync

- [x] 3.1 Move `syncSlots` to per-manifest collections, keeping create, update, stale, draft-skip and dedupe behavior. Verify by porting `src/lib/staticPageSync.test.ts` to per-page collections, all green.
- [x] 3.2 Sync `title` ("01 · SEO · …" / "04 · Content · …"), `section` and `position` from code, and report missing collections in `collectionsMissing` without creating them. Verify with tests: reorder slots → positions update and values are kept; a slot with an open draft is skipped; a missing collection is reported and nothing is created.
- [x] 3.3 Number slots per D3 (SEO first, then content, zero-padded to the collection's width). Verify with a test that sorting a page's rows by title ascending gives every SEO slot first, then content in declaration order, including a manifest that declares SEO slots last and the 100+ slot site-wide manifest.

## 4. Seed and migration scripts

- [x] 4.1 Make `transform.mjs` emit the copy collections and the config's collection settings into `seed/seed.json`, and make `pageCopyEntries` write each slot into its page's collection with title, section and position. Verify by updating `transform`/`mappers` tests and regenerating the seed; `npx emdash seed` on a fresh database succeeds.
- [x] 4.2 Point `importcopy.mjs` at the per-page collections. Verify by updating `importcopy.test.mjs`.
- [x] 4.3 Add `scripts/cms-schema.mjs` (`npm run cms:schema`, `--dry-run`, `EMDASH_ADMIN_TOKEN`): create missing copy collections and fields, update collection settings, touch nothing else. Verify with unit tests on a fake client: diff-only writes, a second run is a no-op, and menus, settings and content are never called.
- [x] 4.4 Add `scripts/migrate/copy-collections.mjs` (`npm run migrate:copy-collections`): move `page_copy` published values, open drafts and Spanish translations into the per-page collections, skip rows already present, and hide `page_copy` when complete. Verify with unit tests: values, drafts and translation links are preserved; a re-run changes nothing.

## 5. Guard

- [x] 5.1 Apply the slot rules to every copy collection (`isCopyCollection`) and treat title, section and position as structural. Verify by updating `marketingGuard.test.ts`: a value edit is allowed; section, position or title changes, create, delete and duplicate are refused.
- [x] 5.2 Add explicit tests that marketing users are refused schema-writing MCP tools and REST `/schema/*` writes (collection update, group or sortOrder change, field create).

## 6. Collections and labels

- [x] 6.1 Relabel `campaign_settings` ("Site banner", "Show the banner", banner text label), `campaign_updates` ("Earthquake relief updates") and `children` ("Children"), and add descriptions to every collection. Verify no slug changes: `npm test` and `npm run verify-menu` pass.

## 7. End to end

- [x] 7.1 Port `e2e/drafts.spec.ts` to a page copy collection, and add an e2e check that the admin's collections API reports the three folders, page entries in order and `pages` hidden. Verify on a freshly seeded database.
- [x] 7.2 Upgrade check: copy the local `data.db` to a scratch path, add a menu edit and an open copy draft, run `cms:schema` then `migrate:copy-collections` against a server on it, and confirm the menu, the draft and the edited copy survive, the sidebar shows the new layout, and a second run reports no changes.
- [x] 7.4 Follow-up from the upgrade on the dev server: EmDash rejects the multi-line `value` as a list column. It's dropped, `value` is searchable instead (user's choice), and `cms:schema` updates existing copy fields and clears the column. Verified on the upgraded scratch copy: a text search finds the slot, and a second run is a no-op.
- [x] 7.3 Check in the admin UI (browser) — checked manually by the user on 2026-10-04 after upgrading their local CMS: Pages & SEO › Home sorted by Title lists SEO slots first, then content in page order; the Draft filter shows only pending edits; Site banner toggles the banner on the site.

## 8. Docs

- [x] 8.1 Update `marketing-guide.md` with a sidebar map, where each kind of text lives, finding drafts with the status filter, and MCP prompt patterns that name the page collection. Update `localization-and-copy.md` (storage, adding a page means adding it to `cmsNavigation.mjs` and running `cms:schema`), `marketing-access.md` (copy collections, schema writes refused) and the README / `.env.example` (`EMDASH_ADMIN_TOKEN`, deploy steps). Verify `npm run build` in `docs-site/` passes.
- [ ] 8.2 Run the full suite (`npm test`, `npm run verify-menu`, e2e, docs build) before archiving, and archive only after `marketing-editing-and-localization`.
