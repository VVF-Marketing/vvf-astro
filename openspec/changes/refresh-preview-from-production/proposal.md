## Why

Previews start from the preview parent, which today holds only the public seed. Once production is live, editors change content there, so previews drift away from what the site really shows. Reviewers then check a change against stale pages. The rule from `add-vercel-deploy-pipeline` (design D1, decided with the user 2026-10-23) still holds: **child data never leaves production**. So previews may take production's public content, but only through a narrow, one-way copy.

Depends on `move-production-to-vercel` (production must be live) and `add-vercel-deploy-pipeline` (preview parent, `reset-preview-parent`, stand-in children). Basecamp card: none yet (2026-10-23).

## What Changes

- **A preview refresh.** A manual workflow, `refresh-preview-parent`, runs only from `main`. It replaces the preview parent's public content with production's, then adds the stand-in children. Data only goes from production to the preview parent, never back.
- **Allowlist, default-deny.**
  - The refresh copies only named collections: every collection except `children`, plus menus and categories, and the media those entries reference.
  - It never copies EmDash users, sessions, API tokens, revisions or trash.
  - A collection added later isn't copied until it's added to the allowlist.
  - The refresh refuses to run if the allowlist ever names `children`.
- **Media copied, not linked.** The media that copied entries reference is copied from the production store into the preview store, so previews never depend on, or point at, the store that holds child photos.
- **The preview parent keeps its own users and sync token.** Only content is replaced, so the admin user and `EMDASH_SYNC_PAT` survive a refresh.
- **Open previews keep their copy.** A refresh changes only the preview parent. A preview database already copied from it is left as it is; reopening the PR gives it fresh content.
- **Replaces `reset-preview-parent` and the `seed-snapshot` branch.** One manual workflow keeps the preview parent current and clean. This is a **BREAKING** change for anyone who runs the reset workflow.
- **A read-only production credential**, used only by this workflow: a read-only database URL in a GitHub environment limited to `main`, plus read access to the production store's media. No write credential to production is added anywhere.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `deploy-pipeline` (added by `add-vercel-deploy-pipeline`, archived first): "Child data never leaves production" gains the refresh's allowlist, default-deny and refusal scenarios, and the reset workflow is replaced by the refresh.

## Impact

- **New:** `scripts/deploy/refresh-preview-parent.mjs` (allowlist, refusal check, content replace, media copy), with unit tests against fake databases; `.github/workflows/refresh-preview-parent.yml` (`workflow_dispatch`, `main` only).
- **Removed:** `scripts/deploy/preview-parent.mjs`, `.github/workflows/reset-preview-parent.yml`, and the `seed-snapshot` and `main-before-reset-*` branches in `vvf-preview` (deleted with the user's approval).
- **External setup:** a read-only Postgres role on `vvf-production`; its URL and read access to `vvf-media-production` in a GitHub environment limited to `main`.
- **Docs:** `deploying-to-vercel.md` (when and how to refresh, what is and isn't copied); `GLOSSARY.md` already defines *preview refresh*.
- **Safeguarding:**
  - The refresh is the only path from production to any preview. It's one-way, default-deny and refuses `children`.
  - Its credential can only read.
  - The allowlist and the refusal check are covered by unit tests, so a change that weakens either fails CI.
