# Issue tracker: Basecamp + OpenSpec + GitHub PRs

Work arrives as Basecamp cards, gets planned as an OpenSpec change, and ships as a GitHub PR.

**CRITICAL:** Basecamp access is restricted to the VVF project only (`-p 43742602`). Never query or modify any other project, account, or bucket. Always pass `-p 43742602`.

## Tickets (Basecamp "Tareas" card table)

- **List**: `basecamp cards list -p 43742602 --json`
- **Read**: `basecamp cards show <id|url> -p 43742602 --json`; comments: `basecamp comments list <id> -p 43742602`
- **Comment**: `basecamp comments create <id> -p 43742602 ...`
- **Create**: `basecamp cards create -p 43742602 ...` only when asked. Cards are usually written by humans.
- **Close**: `basecamp cards done <id|url> -p 43742602`, done when the OpenSpec change is archived. Never close a card before that.

## Specs (OpenSpec)

The spec for a card is `openspec/changes/<change>/` (`proposal.md`, `design.md`, `specs/`, `tasks.md`). Archived changes live in `openspec/changes/archive/`. `proposal.md` links the Basecamp card URL. Create and advance specs with the `openspec-*` skills, not by hand.

## Pull requests (GitHub, `paulainc/vvf-astro`)

- Code ships as PRs into `main` via `gh pr create`, using `.github/pull_request_template.md`.
- **Read**: `gh pr view <n> --comments`, `gh pr diff <n>`
- The PR body links the OpenSpec change and the Basecamp card.

**PRs as a request surface: no.**

## When a skill says "publish to the issue tracker"

Don't create Basecamp cards unprompted. Propose an OpenSpec change (`openspec-propose`), or ask the user whether to create a card.

## When a skill says "fetch the relevant ticket"

1. Find the OpenSpec change for the branch: look in `openspec/changes/*/proposal.md`, then in the archive.
2. Follow its Basecamp URL with `basecamp cards show`.
3. If there's a PR, read it with `gh pr view`.

## Wayfinding

Not configured. `/wayfinder` isn't installed.
