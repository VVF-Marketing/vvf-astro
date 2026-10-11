# dev-environment Specification

## Purpose

Gives every contributor a containerized local dev environment that behaves identically regardless of host OS or device, with the project's services runnable out of the box and the setup path documented for new devs.

## Requirements

### Requirement: Containerized dev environment definition
The repo SHALL provide a dev container definition that pins the Node.js runtime version and includes the system dependencies required to run this project's services and test suites, so that local dev behaves the same on any host device.

#### Scenario: Opening the repo in a supporting editor
- **WHEN** a contributor opens the repo in an editor or platform that supports dev containers (e.g. VS Code, GitHub Codespaces)
- **THEN** they are offered to build/open the project inside the defined container, using the pinned Node.js version and preinstalled system dependencies, instead of relying on whatever is installed on their host

#### Scenario: Running Playwright e2e tests inside the container
- **WHEN** a contributor runs `npm run test:e2e` inside the dev container
- **THEN** the Playwright browsers and OS-level dependencies they require are already present, without additional manual installation steps

### Requirement: Automated dependency installation on container creation
The dev container SHALL automatically install the project's npm dependencies for both the root app and `docs-site/` when the container is created, so a contributor can start working without running manual install steps first.

#### Scenario: First container build
- **WHEN** the dev container is built for the first time (or rebuilt after a definition change)
- **THEN** `npm install` has already run for the root project and for `docs-site/` before the contributor is dropped into a shell

### Requirement: Forwarded access to project services
The dev container SHALL forward the ports used by the project's local services, so each one is reachable from the host machine while running inside the container.

#### Scenario: Running the main site and EmDash admin
- **WHEN** a contributor runs `npm run dev` inside the dev container
- **THEN** the Astro site and EmDash admin are reachable from the host at `http://localhost:4321` and `http://localhost:4321/_emdash/admin`, exactly as when run outside a container

#### Scenario: Running Storybook
- **WHEN** a contributor runs `npm run storybook` inside the dev container
- **THEN** Storybook is reachable from the host at `http://localhost:6006`

#### Scenario: Running the docs site
- **WHEN** a contributor runs `npm run dev` inside `docs-site/` in the dev container
- **THEN** the docs site is reachable from the host at `http://localhost:4321`

### Requirement: Documented dev container setup path
The project's setup documentation SHALL describe the dev container as a supported way to get a working local environment, in addition to the existing manual `npm install` path.

#### Scenario: New dev reads the README
- **WHEN** a new contributor reads `README.md`'s "Getting started" section
- **THEN** they find instructions for opening the project in the dev container as an alternative to manual local setup

#### Scenario: New dev reads the docs site
- **WHEN** a new contributor reads the "Getting Started" page on the docs site
- **THEN** they find the same dev container setup path documented there

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
