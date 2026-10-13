---
title: Marketing Access & Safeguards
description: How the marketing team gets edit access through EmDash's MCP endpoint, and the server-side rules that keep their edits safe.
---

The marketing team edits copy, SEO and CMS items in both languages — from the EmDash admin or from an AI assistant connected to EmDash's built-in MCP endpoint, `/_emdash/api/mcp`. EmDash's roles and token scopes decide what a user may do in general; a guard in this project (`src/lib/marketingGuard.ts`, applied by `src/middleware.ts`) adds the rules EmDash can't express.

The marketing guide for non-developers is [Editing the Site](/marketing-guide/).

## Setting up a marketing user

1. In the admin (**Settings → Users**), invite the person with the **Editor** role. Editors can edit and publish any item, including those imported by the migration (which have no author, so Author-role users couldn't edit them).
2. They sign in to the admin with a passkey or magic link.
3. To use an AI assistant, they add `https://<site>/_emdash/api/mcp` as a custom connector in their MCP client and complete the OAuth sign-in. Grant **content** and **media** scopes only — never `schema:*`, `settings:*` or admin. Don't issue personal access tokens to marketing users; OAuth tokens are scoped and short-lived.

## Safeguarding allowlist

Child profiles require safeguarding sign-off. Set `SAFEGUARDING_USERS` on the server to a comma-separated list of the email addresses of the people who may create, change, publish, translate or delete child profiles:

```bash
SAFEGUARDING_USERS=person.one@example.org,person.two@example.org
```

It's read from the server environment only — never commit real addresses (the repository is public). Admins are not restricted by the guard.

## What the guard enforces

For every user below the Admin role, on both the MCP endpoint and the admin REST API:

| Rule | Behavior |
| --- | --- |
| Child profiles | Only allowlisted users can write to `children`. Everyone else can read **published** profiles only, and never receives a child's private full name; unpublished profiles return not-found. |
| Copy slots | Applies to every page copy collection (*Pages & SEO* in the admin). Only the slot's value can change; its title, section, number, label, format and limit can't, in the slot's format and within its maximum length (SEO titles 60, descriptions 160 characters). Rich text is limited to supported formatting. Slots can't be created or deleted by hand. Values migrated from the live site that exceed a limit are kept until someone edits them. |
| Page list | `pages` is maintained by the sync and is read-only. |
| Menus | Every link must point to a page of the site in the menu's locale (`/es/...` for the Spanish menu) or be external; menu items can't set CSS classes. |
| Links back into the site | Menu items, rich-text links and link fields (e.g. CTA URLs) must use a path such as `/ways-to-give`, not the site's full address; the edit is refused with the path to use. (Rendering normalizes such links anyway — see [Localization & Page Copy](/localization-and-copy/#locales-and-routing).) |
| Translations | A translation can only be created as a draft; a person reviews and publishes it. |
| Schema | Collections, fields and the sidebar's folders, order and names can't be changed, through MCP tools or REST `/schema` writes; reading the schema is allowed. |
| Everything else | MCP tools the guard doesn't know are refused (deny by default): settings, users, permanent deletes. |

Refusals come back as readable messages (an MCP tool error, or a 403/404 from the REST API) so the assistant can explain what happened.

## Undo

Every content collection and every page copy collection keeps drafts and a revision history: unpublished edits never reach the site, any published change can be undone by restoring an earlier revision, and deletes go to the trash (permanent deletes are admin-only).

## Activity log

Marketing users may publish directly, including through their AI assistants, so every publish and unpublish is recorded: when, which item and language, who, and how — **AI assistant (MCP)**, **API token**, **Admin** (by hand), or **Scheduled**. Admins see it on the **Activity** page in the admin sidebar (other roles are refused).

It's a small EmDash plugin in this repo (`src/plugins/activityLog.ts`, registered in `astro.config.mjs`). EmDash's publish hooks don't say who published, so `src/middleware.ts` runs each `/_emdash/api/` request with its user and channel (`src/lib/activityContext.ts`) and the plugin reads them back. Child profiles are logged by slug only.

## Testing

`src/lib/marketingGuard.test.ts` covers each rule; `e2e/drafts.spec.ts` checks drafts, publishing and revision restore against a running server (it needs `EMDASH_SYNC_PAT` and is skipped in CI).
