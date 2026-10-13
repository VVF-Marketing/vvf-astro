## ADDED Requirements

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
