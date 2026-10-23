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

### Requirement: Child data never leaves production
Preview databases SHALL be created only from the preview parent, never from the production database or an export of it. The preview parent SHALL hold only public content (from the public seed, or from an allowlisted refresh of production's public content) and stand-in children, and never child data or production users, sessions, tokens or revisions. Previews SHALL use a media store that holds only public media and preview uploads, never the production store. Stand-in children SHALL never be added to production.

#### Scenario: Preview database contents
- **WHEN** a preview's database is inspected
- **THEN** its only child profiles are stand-in children, and it contains no real child photo, real user or production revision

#### Scenario: Preview media store
- **WHEN** the Preview environment's media storage settings are inspected
- **THEN** they point at the preview store, not the production one

#### Scenario: Production setup
- **WHEN** production's database is set up or migrated
- **THEN** no stand-in children are added

### Requirement: Preview cleanup
When a pull request is closed or merged, its preview database branch SHALL be deleted. Preview database branches SHALL also expire automatically if cleanup fails.

#### Scenario: PR merged
- **WHEN** a pull request is merged
- **THEN** its database branch no longer exists after the cleanup run

#### Scenario: PR merged while its check runs
- **WHEN** a pull request is merged while its preview check is still running
- **THEN** the check is cancelled before the database branch is deleted, and no run is left waiting on the deleted database

#### Scenario: Check hangs
- **WHEN** a preview check doesn't finish within 30 minutes
- **THEN** it fails

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
Production secrets SHALL be available only to workflow jobs deploying `main` to production. A pull request's code SHALL never run in a job that holds a deploy credential (the Vercel token or the Neon API key), even when the pull request changes a workflow: pull-request code is built without secrets, and the job that deploys previews SHALL always run the workflow definition on `main`, and SHALL run pull-request code only after its last use of those credentials. Production's Vercel variables SHALL be write-only (sensitive). Every variable each environment needs SHALL be documented.

#### Scenario: Workflow from a pull request
- **WHEN** a workflow runs for a pull request
- **THEN** it can't read the production database URL, Blob token, fingerprint or sync token, and it gets no Vercel token or Neon key

#### Scenario: Pull request changes the build workflow
- **WHEN** a pull request edits the preview build workflow to print or use a secret, or to run `vercel deploy --prod`
- **THEN** the job has no secret to print or use, so nothing reaches Vercel or Neon

#### Scenario: Pull request changes the deploy workflow
- **WHEN** a pull request edits the preview deploy workflow
- **THEN** its preview is still deployed by the definition on `main`; the edit takes effect only after it's reviewed and merged

#### Scenario: Pull-request code runs during a preview deploy
- **WHEN** the preview deploy job runs the pull request's migrations
- **THEN** that step's environment holds only the pull request's preview branch database URL, and every step that uses the Vercel token or the Neon key has already finished
