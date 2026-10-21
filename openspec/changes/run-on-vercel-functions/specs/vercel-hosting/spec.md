# Spec Delta

## Purpose

Lets the site run correctly on Vercel's short-lived functions, with the same behaviour as the long-lived Node server: settings, scheduled work, background work, database connections and routing.

## ADDED Requirements

### Requirement: Vercel build target
The site SHALL build for Vercel when the build is told to target Vercel, and for the Node server otherwise. The Vercel build SHALL run on the Node.js runtime in a single region next to the database. Building for Vercel SHALL NOT change local development or the container image.

#### Scenario: Vercel build
- **WHEN** the site is built with the Vercel target selected
- **THEN** the output is a Vercel deployment that serves every page, the CMS admin and its API

#### Scenario: Default build unchanged
- **WHEN** `npm run dev` runs, or the container image is built, without the Vercel target
- **THEN** the site runs on the Node server exactly as before

### Requirement: Missing settings reported without a launcher
On Vercel, when a setting required by the deployment's mode is missing, the site SHALL answer every request except `/healthz` with 503, and log the missing variable's name. The response SHALL NOT reveal which variable is missing. The same check SHALL be runnable before deploying, so a deploy can be stopped before it serves traffic.

#### Scenario: Database URL missing
- **WHEN** a Vercel deployment built for Postgres runs without `DATABASE_URL`
- **THEN** pages answer 503, `/readyz` answers 503, and the function log names `DATABASE_URL`

#### Scenario: Checked before deploy
- **WHEN** the pre-deploy check runs against an environment missing a required variable
- **THEN** it exits non-zero naming the variable, and nothing is deployed

### Requirement: Scheduled work driven by Vercel Cron
On Vercel, scheduled publishing, plugin cron jobs and CMS cleanup SHALL be run by a Vercel Cron schedule calling a protected endpoint at least every 5 minutes. They SHALL NOT depend on an in-process timer. The endpoint SHALL refuse callers without the cron secret, and return status only.

#### Scenario: Scheduled post goes live
- **WHEN** an editor schedules an entry for 10:00 and no visitor requests the site around that time
- **THEN** the entry is published by 10:05

#### Scenario: Unauthorised call
- **WHEN** the scheduled-work endpoint is called without the cron secret
- **THEN** it answers 401 and runs nothing

#### Scenario: Overlapping runs
- **WHEN** two runs of the scheduled work overlap
- **THEN** each due entry is published once, and no plugin cron job runs twice for the same tick

### Requirement: Deferred work completes after the response
On Vercel, work the site or the CMS defers until after a response is sent SHALL be kept alive by the platform until it finishes or fails, within the function's time limit.

#### Scenario: Deferred bookkeeping
- **WHEN** a request schedules deferred work and the response has already been sent
- **THEN** the work runs to completion and its result is persisted, even if no other request arrives

### Requirement: Serverless database connections
On Vercel, the site SHALL connect to Postgres through a pooled connection at runtime, and run migrations and setup through a direct connection. Each instance SHALL keep its connection count small and release idle connections, so many instances don't exhaust the database's connection limit.

#### Scenario: Traffic spike
- **WHEN** Vercel scales to many concurrent instances
- **THEN** requests keep being served without "too many connections" errors

#### Scenario: Migrations
- **WHEN** migrations or `npm run db:setup` run against a Neon database
- **THEN** they use the direct connection, and succeed

### Requirement: Routing parity with the Node server
On Vercel, every legacy redirect SHALL answer with the same status code and destination as on the Node server. Spanish routes under `/es`, the health endpoints, the sitemap and the CMS admin SHALL behave the same.

#### Scenario: Permanent legacy redirect
- **WHEN** a visitor requests an old Webflow URL that redirects permanently
- **THEN** the Vercel deployment answers 301 (not 308) to the same destination as the Node server

#### Scenario: Spanish page
- **WHEN** a visitor requests `/es/contact` on Vercel
- **THEN** the Spanish contact page is served, as on the Node server
