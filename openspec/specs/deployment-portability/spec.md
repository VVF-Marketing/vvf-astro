# deployment-portability Specification

## Purpose
Lets the site run from one container image in any environment and on any hosting provider, with its data movable between them, so hosting can be chosen or changed without rewriting the app.

## Requirements

### Requirement: One container image for every environment
The site SHALL build into a single container image that runs unchanged in every deployed environment (staging, previews, production). The image SHALL contain only what the server needs to run (no source tree, tests or development tooling), SHALL run as a non-root user, and SHALL declare a health check.

#### Scenario: Same image, different environments
- **WHEN** the image built for a commit runs on staging and is then promoted to production
- **THEN** it is the same image, and only its runtime environment variables differ

#### Scenario: No source files needed
- **WHEN** the image starts without the `src/` directory
- **THEN** the site and the static-page sync work, and no "file not found" errors are logged

### Requirement: Configuration read at runtime
Every secret and environment-specific setting SHALL be read when the server starts, not when the site is built. That covers API tokens, the safeguarding allowlist, and database and storage connection details. The canonical site URL SHALL stay the production address in every environment, so staging and preview copies never compete with production in search. A missing required value SHALL stop the server at startup with a message naming the variable. Every variable SHALL be documented in `.env.example`.

#### Scenario: Secret changed without a rebuild
- **WHEN** `EMDASH_SYNC_PAT` is rotated in an environment and the server restarts
- **THEN** the new token is used, with no rebuild

#### Scenario: Missing required setting
- **WHEN** the server starts in Postgres mode without `DATABASE_URL`
- **THEN** it exits immediately with an error naming `DATABASE_URL`

### Requirement: Database chosen by environment
The site SHALL run on Postgres when a Postgres connection string is configured, and on a local SQLite file otherwise. Content, migrations, seeding, the static-page sync, the marketing guard and every page SHALL behave the same on both.

#### Scenario: Local development unchanged
- **WHEN** a developer runs `npm run dev` with no database settings
- **THEN** the site uses `./data.db` as today

#### Scenario: Names valid on both databases
- **WHEN** a collection is added whose name would make EmDash's Postgres index names collide after Postgres' 63-character limit
- **THEN** a unit test fails before the change can be merged

#### Scenario: Deployed on Postgres
- **WHEN** the image runs with `DATABASE_URL` pointing at an empty Postgres database and the site is seeded
- **THEN** every page renders the same content as on SQLite, and the e2e suite passes

### Requirement: Media storage chosen by environment
Uploaded media SHALL be stored in an S3-compatible bucket when S3 settings are configured, and on local disk otherwise. Media URLs on pages SHALL work in both modes. A script SHALL copy all existing media from one store to the other without changing the content that references it.

#### Scenario: Media in a bucket
- **WHEN** the site runs with S3 settings and an editor uploads an image
- **THEN** the file is stored in the bucket, and the page shows it

#### Scenario: Moving media to a bucket
- **WHEN** the copy script runs from local disk to an empty bucket
- **THEN** every media item is in the bucket, and every page that showed an image still shows it

### Requirement: No local state when deployed
In deployed mode (Postgres and S3 configured), the site SHALL keep no state on the container's disk: no database file, no uploads and no session files. Admin sessions SHALL be stored in the configured database, so any instance can serve any logged-in editor.

#### Scenario: Two instances
- **WHEN** two containers from the same image serve the site behind a load balancer and an editor signs in
- **THEN** the editor stays signed in whichever instance serves the next request

#### Scenario: Container replaced
- **WHEN** a container is destroyed and a new one starts
- **THEN** no content, media or sign-ins are lost

### Requirement: Health endpoints
The site SHALL expose `/healthz`, which answers 200 while the server process is running, and `/readyz`, which answers 200 only when the database and media storage respond, and 503 otherwise. Neither SHALL be localized, cached, listed in the sitemap, or reveal configuration details.

#### Scenario: Database down
- **WHEN** the database can't be reached
- **THEN** `/healthz` answers 200 and `/readyz` answers 503

#### Scenario: Ready after start
- **WHEN** a new container has started and connected to its database and storage
- **THEN** `/readyz` answers 200, so a platform can switch traffic to it

### Requirement: Portable data
The site SHALL provide an export of the full database content and media into one archive, and an import of that archive into another environment, in either database and either storage mode. Exports contain child data, so they SHALL never be written inside the repository, and the documentation SHALL say they must be handled as safeguarding data.

#### Scenario: Moving from SQLite to Postgres
- **WHEN** a local SQLite site with media on disk is exported and imported into Postgres + S3
- **THEN** the imported site shows the same pages, content, menus, media, users and copy

#### Scenario: Export kept out of the repository
- **WHEN** an export is run without an output path
- **THEN** it is written outside the repository working tree (or refused), never into tracked or untracked repository files

### Requirement: Portability tested in CI
Every pull request SHALL build the container image and run the e2e suite against it on Postgres with S3-compatible storage, in addition to the existing checks.

#### Scenario: A change breaks Postgres
- **WHEN** a change works on SQLite but fails on Postgres
- **THEN** the pull request's container job fails

### Requirement: Seeded environments include public media
Seeding a new, empty environment from the public seed SHALL also load the public media it references (images and documents), into the configured storage, in either database mode (SQLite or Postgres) and either storage mode (disk or S3-compatible). Media values in the public seed SHALL be the same in every environment, so content never depends on which database was seeded. Child media SHALL never be part of the public seed, the repository, or any container image.

#### Scenario: New Postgres + S3 environment
- **WHEN** `npm run db:setup` seeds an empty Postgres database with S3 storage
- **THEN** event photos, team photos, resource covers and report PDFs display and download, the same as on a locally seeded SQLite site

#### Scenario: Re-running setup
- **WHEN** setup runs again against an environment that already has the seeded media
- **THEN** no media file is uploaded twice and no duplicate media rows are created

#### Scenario: Child media stays out
- **WHEN** the public seed, the build context or the tools image is inspected
- **THEN** it contains no child photo, child alt text or child media ID

#### Scenario: Media tested on Postgres
- **WHEN** the CI container job runs the e2e suite against the Postgres + S3 image
- **THEN** the tests that need uploaded media run and pass, with none skipped for lack of media
