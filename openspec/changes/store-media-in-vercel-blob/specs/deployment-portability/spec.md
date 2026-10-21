# Spec Delta

## MODIFIED Requirements

### Requirement: Media storage chosen by environment
Uploaded media SHALL be stored in Vercel Blob when Blob is configured, in an S3-compatible bucket when S3 settings are configured, and on local disk otherwise. Media URLs on pages SHALL work in every mode and SHALL NOT change between modes. A script SHALL copy all existing media from one store to another without changing the content that references it.

#### Scenario: Media in a bucket
- **WHEN** the site runs with S3 settings and an editor uploads an image
- **THEN** the file is stored in the bucket, and the page shows it

#### Scenario: Moving media to a bucket
- **WHEN** the copy script runs from local disk to an empty bucket
- **THEN** every media item is in the bucket, and every page that showed an image still shows it

#### Scenario: Media in Vercel Blob
- **WHEN** the site runs on Vercel with Blob configured and an editor uploads an image
- **THEN** the file is stored in Blob, and the page shows it at the same kind of URL as on S3

#### Scenario: Moving media to Blob
- **WHEN** the copy script runs from local disk or an S3 bucket to an empty Blob store
- **THEN** every media item is in Blob under the same key, and every page that showed an image or linked a document still does

### Requirement: Seeded environments include public media
Seeding a new, empty environment from the public seed SHALL also load the public media it references (images and documents) into the configured storage. This SHALL work in either database mode (SQLite or Postgres) and any storage mode (disk, S3-compatible or Vercel Blob). Media values in the public seed SHALL be the same in every environment, so content never depends on which database was seeded. Child media SHALL never be part of the public seed, the repository, or any container image.

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

#### Scenario: New Neon + Blob environment
- **WHEN** `npm run db:setup` seeds an empty Neon database with Blob storage
- **THEN** the same media displays and downloads as on a locally seeded SQLite site

### Requirement: Portable data
The site SHALL provide an export of the full database content and media into one archive, and an import of that archive into another environment, in either database and any storage mode. Exports contain child data, so they SHALL never be written inside the repository, and the documentation SHALL say they must be handled as safeguarding data.

#### Scenario: Moving from SQLite to Postgres
- **WHEN** a local SQLite site with media on disk is exported and imported into Postgres + S3
- **THEN** the imported site shows the same pages, content, menus, media, users and copy

#### Scenario: Export kept out of the repository
- **WHEN** an export is run without an output path
- **THEN** it is written outside the repository working tree (or refused), never into tracked or untracked repository files

#### Scenario: Moving to Neon + Blob
- **WHEN** a local SQLite site with media on disk is exported and imported into Neon + Blob
- **THEN** the imported site shows the same pages, content, menus, media, users and copy

## ADDED Requirements

### Requirement: Large uploads on serverless hosts
On hosts that limit request and response sizes (Vercel's 4.5 MB), editors SHALL still be able to upload, and visitors to download, media files of at least 50 MB. Uploads go directly from the browser to the media store.

#### Scenario: Large report PDF
- **WHEN** an editor uploads a 20 MB PDF in the CMS admin on Vercel
- **THEN** the upload succeeds, and visitors can download the full file from the resource page

### Requirement: Non-public media stays private
Files that aren't meant for visitors (CMS backups under `backups/`) SHALL NOT be readable through any public media URL or public store URL in any storage mode. Media SHALL only be reachable through URLs the site serves or links to, and listing the store SHALL require the store's credentials.

#### Scenario: Backup in Blob
- **WHEN** an admin creates a CMS backup on a Blob-backed site
- **THEN** neither the media route nor a direct Blob URL built from the backup's key returns it to an anonymous visitor

#### Scenario: Guessing media URLs
- **WHEN** an anonymous visitor requests store URLs for keys that no page links to
- **THEN** they can't list the store, and they can't derive other files' keys from the ones they've seen
