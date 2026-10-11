## Purpose
Defines CMS collections for storing content such as news, projects, and events.

## ADDED Requirements

### Requirement: News collection
The system SHALL expose a `news` CMS collection with fields: title (string), date (date), author (string), body (rich text), and image (asset).

#### Scenario: Create news item
- **WHEN** an editor creates a news article
- **THEN** the data is stored in `news/` collection and visible on the front‑end.
