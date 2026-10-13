## MODIFIED Requirements

### Requirement: Copy slot sync
The sync SHALL make each page copy collection match the copy slots its manifest declares in code. It SHALL:
- create missing slot entries for each locale (English with the declared default, Spanish empty);
- update each slot's label, section, position, format and maximum length from code;
- never overwrite a slot's value, and never publish an editor's unpublished draft;
- mark entries whose slot is no longer declared as stale rather than deleting them.

The sync SHALL NOT create, change or delete collections. When a manifest's collection doesn't exist yet, the sync SHALL skip that manifest, report it, and leave the page rendering its defaults.

#### Scenario: New slot declared
- **WHEN** a developer declares a new slot on a page and the server starts
- **THEN** after the first request, that page's copy collection has an English entry with the default value and an empty Spanish entry for it

#### Scenario: Slot limit changed
- **WHEN** a developer changes a slot's maximum length in code
- **THEN** the sync updates the entries' maximum length and leaves their values unchanged

#### Scenario: Slot removed
- **WHEN** a slot is no longer declared in code
- **THEN** its entries are marked stale and kept

#### Scenario: Slot moved on the page
- **WHEN** a developer reorders a page's slots in code
- **THEN** the slots' positions follow, without changing their values or publishing an editor's draft

#### Scenario: New page before its collection exists
- **WHEN** a developer adds a page with a new copy manifest and the server starts before the schema is applied
- **THEN** the sync reports the missing collection, creates no collection, and the page renders its declared defaults
