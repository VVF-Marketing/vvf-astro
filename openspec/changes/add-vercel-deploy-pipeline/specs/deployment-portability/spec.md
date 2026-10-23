# Spec Delta

## MODIFIED Requirements

### Requirement: Portability tested in CI
Every pull request SHALL build the container image and run the e2e suite against it on Postgres with S3-compatible storage, in addition to the existing checks. Every pull request from this repository SHALL also run the smoke suite against its Vercel preview deployment on Neon Postgres with Vercel Blob.

#### Scenario: A change breaks Postgres
- **WHEN** a change works on SQLite but fails on Postgres
- **THEN** the pull request's container job fails

#### Scenario: A change breaks Vercel
- **WHEN** a change works in the container but fails on Vercel functions
- **THEN** the pull request's preview smoke check fails
