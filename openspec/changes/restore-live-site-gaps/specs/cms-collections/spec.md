## ADDED Requirements

### Requirement: Recap stat caption
Each item in an event's recap `stats` repeater SHALL have an optional `caption` beside its `value` and `label`. The caption is translatable. An empty caption shows nothing.

#### Scenario: Editor adds a caption
- **WHEN** an editor fills a stat's caption on a past event and publishes
- **THEN** the caption shows under that stat's label on the event page
