## ADDED Requirements

### Requirement: Recap stat caption
Each item in an event's recap `stats` repeater SHALL have an optional `caption` beside its `value` and `label`. The caption is translatable. An empty caption shows nothing.

#### Scenario: Editor adds a caption
- **WHEN** an editor fills a stat's caption on a past event and publishes
- **THEN** the caption shows under that stat's label on the event page

### Requirement: Event card photo
An event SHALL have an optional `card_photo` image for event lists, cropped with its subject centered. Event cards SHALL use it at every width when it is set, and the hero photos (desktop, and phone when present) when it is empty. The event page itself keeps using the hero photos.

#### Scenario: 2026 tournament card
- **WHEN** `/events-and-campaigns` or `/es/events-and-campaigns` is rendered at any width
- **THEN** the 2026 tournament's card shows its card photo, with no phone photo source

#### Scenario: Event without a card photo
- **WHEN** an event's card photo is empty
- **THEN** its card shows the hero photo, and the phone hero photo on phones when set
