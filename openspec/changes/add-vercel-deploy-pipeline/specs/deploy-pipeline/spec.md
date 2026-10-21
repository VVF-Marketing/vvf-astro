# Spec Delta

## Purpose

Gets every change to Vercel safely and without manual steps: a preview with isolated data for each pull request, and a gated, staged, reversible production deploy on merge.

## ADDED Requirements

### Requirement: Deploys only through the pipeline
Deployments to the site's Vercel project SHALL be created only by the repository's deploy workflow, never by Vercel's automatic Git deployments. Each deployment SHALL be built once and deployed from that prebuilt output.

#### Scenario: Push without the pipeline
- **WHEN** a commit is pushed to any branch
- **THEN** Vercel creates no deployment on its own; only the deploy workflow does

### Requirement: Preview per pull request
Each open pull request from this repository SHALL get a preview deployment for its latest commit. The preview SHALL have its own database, migrated to that commit, and its static pages synced. Its URL SHALL be posted on the pull request.

#### Scenario: PR opened
- **WHEN** a pull request is opened
- **THEN** within the workflow run, a preview deployment answers `/readyz` with 200, and its URL is posted on the PR

#### Scenario: New commit on the PR
- **WHEN** a new commit is pushed to the pull request
- **THEN** the preview is redeployed for that commit, on the same database branch, with any new migrations applied

#### Scenario: Two PRs with different migrations
- **WHEN** two open pull requests each add a migration
- **THEN** each preview's database has only its own PR's migration, and neither preview breaks the other

### Requirement: Preview data is never production data
Preview databases SHALL be created only from a preview source seeded with the public seed, never from the production database or an export of it. Previews SHALL use a media store that holds only public seed media and preview uploads, never the production store.

#### Scenario: Preview database contents
- **WHEN** a preview's database is inspected
- **THEN** it contains no child profile, child photo, real user or production revision

#### Scenario: Preview media store
- **WHEN** a preview's media storage settings are inspected
- **THEN** they point at the preview store, not the production one

### Requirement: Preview cleanup
When a pull request is closed or merged, its preview database branch SHALL be deleted. Preview database branches SHALL also expire automatically if cleanup fails.

#### Scenario: PR merged
- **WHEN** a pull request is merged
- **THEN** its database branch no longer exists after the cleanup run

### Requirement: Gated production deploy
A merge to `main` SHALL deploy to production only after the full test workflow passes on that commit, the production environment's required settings are present, and production migrations apply cleanly. Production migrations SHALL run only against the database whose pinned fingerprint matches.

#### Scenario: Tests fail on main
- **WHEN** a test job fails on a commit merged to `main`
- **THEN** no production migration runs and no production deployment is created

#### Scenario: Wrong database
- **WHEN** the production database URL points at a database whose fingerprint differs from the pinned one
- **THEN** migration refuses to run, and the deploy stops with the fingerprint mismatch

### Requirement: Staged promotion
A production deployment SHALL first be created without receiving the production domain. It SHALL be checked on its own URL (readiness, then smoke tests), and only then promoted to the domain. Visitors SHALL see no downtime during a deploy.

#### Scenario: Smoke test fails
- **WHEN** a staged production deployment fails its readiness or smoke check
- **THEN** it isn't promoted, and the previous deployment keeps serving the domain

#### Scenario: Successful deploy
- **WHEN** the staged deployment passes its checks
- **THEN** it's promoted, its static pages are synced, and requests to the domain never fail during the switch

### Requirement: One-step rollback
The team SHALL be able to put the previous production deployment back on the domain with one documented command, without a rebuild. Migrations SHALL be backwards-compatible with the previous deployment (expand, then contract in a later release), so a rollback works on the migrated database.

#### Scenario: Bad release
- **WHEN** a release is promoted and then found to be broken
- **THEN** running the documented rollback restores the previous deployment on the domain within a minute, and it works against the current database

### Requirement: Secrets scoped to their environment
Production secrets SHALL be available only to workflow jobs deploying `main` to production. Workflows for pull requests SHALL only receive preview credentials, and those credentials SHALL be unable to deploy to production, read production's variables, or reach production's database or media store, even when a pull request changes the workflow. Every variable each environment needs SHALL be documented.

#### Scenario: Workflow from a pull request
- **WHEN** a workflow runs for a pull request
- **THEN** it can't read the production database URL, Blob token, fingerprint or sync token

#### Scenario: Pull request changes the deploy workflow
- **WHEN** a pull request edits the workflow to run `vercel deploy --prod` or `vercel env pull --environment=production` with the credentials its job receives
- **THEN** the command fails, because those credentials only work on the preview team and project
