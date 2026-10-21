# Spec Delta

## MODIFIED Requirements

### Requirement: Automatic trigger, no manual step
The system SHALL run the sync automatically, without a developer running a manual command. On `astro dev` and the `@astrojs/node` standalone server, it SHALL run on the first incoming HTTP request after the server process starts. On hosts that run many short-lived instances (Vercel), it SHALL run once per deployment: the deploy pipeline triggers it, and if that hasn't happened, the first request to reach the deployment triggers it. Concurrent triggers SHALL NOT create duplicate rows.

#### Scenario: Dev server started, first page load
- **WHEN** `astro dev` starts and a browser makes the first request to any route
- **THEN** the sync runs once for that process before or alongside serving the request

#### Scenario: Sync does not block normal requests
- **WHEN** the sync has already run for the current process
- **THEN** subsequent requests are served without re-running the sync

#### Scenario: New instance of the same deployment
- **WHEN** Vercel starts a new instance of a deployment that has already synced
- **THEN** that instance does not run the sync again

#### Scenario: Concurrent first requests
- **WHEN** several instances of a new deployment receive their first requests at the same moment
- **THEN** the sync runs once, and the `pages` collection and the copy collections have no duplicate rows
