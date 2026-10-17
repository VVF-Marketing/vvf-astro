## ADDED Requirements

### Requirement: Page copy collections protected
The copy-slot protections SHALL apply to every page copy collection: marketing users SHALL only change a slot's value (within its format and maximum length), and SHALL NOT create, duplicate or delete slots in them. Marketing users SHALL NOT create, change or delete any collection, its fields or its sidebar settings.

#### Scenario: Slot metadata change refused in a page collection
- **WHEN** a marketing user tries to change the section or position of a slot in the Home copy collection
- **THEN** the request is rejected and the slot is unchanged

#### Scenario: Collection change refused
- **WHEN** a marketing user asks the MCP to move "Events" out of the CMS collections folder or rename a page copy collection
- **THEN** the request is rejected and the sidebar is unchanged

#### Scenario: Value edit allowed
- **WHEN** a marketing user changes the text of "04 · Content · Hero heading" in Ways to Give within its maximum length
- **THEN** the change is saved as a draft for review
