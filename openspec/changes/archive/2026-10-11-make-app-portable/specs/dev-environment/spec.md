## ADDED Requirements

### Requirement: Dev container keeps its own dependencies
The dev container SHALL keep the project's installed npm dependencies (root and `docs-site/`) in its own storage, separate from the host checkout's `node_modules`, so installing inside the container never replaces the host's platform-specific native packages. The container SHALL have a recognizable name: "VVF dev container" in the editor and `vvf-dev-container` in Docker.

#### Scenario: Host keeps working after the container installs
- **WHEN** a contributor on macOS opens the repo in the dev container and it installs dependencies
- **THEN** `npm run dev` still works on the host afterwards, because the host's `node_modules` was not modified

#### Scenario: Finding the container
- **WHEN** a contributor lists their Docker containers
- **THEN** the project's dev container appears as `vvf-dev-container`

### Requirement: Docker available inside the dev container
The dev container SHALL provide the Docker CLI and Docker Compose, using the host's Docker engine, so the container-based workflows (building the site image, the local Postgres + S3 stack) work from inside it.

#### Scenario: Local deployed stack from the container
- **WHEN** a contributor runs `docker compose up --build` inside the dev container
- **THEN** the site, Postgres and S3-compatible store start on the host's Docker engine
