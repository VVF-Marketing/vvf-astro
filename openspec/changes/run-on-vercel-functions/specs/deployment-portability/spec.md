# Spec Delta

## MODIFIED Requirements

### Requirement: One container image for every environment
The site SHALL build into one artifact per hosting target: a container image, or a Vercel deployment. Each artifact SHALL run unchanged in every deployed environment of its target (staging, previews, production), configured only by runtime environment variables. The container image SHALL contain only what the server needs to run (no source tree, tests or development tooling), SHALL run as a non-root user, and SHALL declare a health check.

#### Scenario: Same image, different environments
- **WHEN** the image built for a commit runs on staging and is then promoted to production
- **THEN** it is the same image, and only its runtime environment variables differ

#### Scenario: No source files needed
- **WHEN** the image starts without the `src/` directory
- **THEN** the site and the static-page sync work, and no "file not found" errors are logged

#### Scenario: Same Vercel build, different environments
- **WHEN** a Vercel build for a commit is deployed as a preview and the same prebuilt output is then deployed to production
- **THEN** no rebuild happens, and only the environment's variables differ

### Requirement: Configuration read at runtime
Every secret and environment-specific setting SHALL be read when the server starts, not when the site is built. That covers API tokens, the safeguarding allowlist, and database and storage connection details. The canonical site URL SHALL stay the production address in every environment, so staging and preview copies never compete with production in search. A missing required value SHALL stop the server at startup with a message naming the variable; on a host without a long-lived server process, it SHALL instead make the site answer 503 and log the variable's name. Every variable SHALL be documented in `.env.example`.

#### Scenario: Secret changed without a rebuild
- **WHEN** `EMDASH_SYNC_PAT` is rotated in an environment and the server restarts
- **THEN** the new token is used, with no rebuild

#### Scenario: Missing required setting
- **WHEN** the server starts in Postgres mode without `DATABASE_URL`
- **THEN** it exits immediately with an error naming `DATABASE_URL`

#### Scenario: Missing required setting on Vercel
- **WHEN** a Vercel deployment in Postgres mode runs without `DATABASE_URL`
- **THEN** requests answer 503, and the function log names `DATABASE_URL`
