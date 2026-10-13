## MODIFIED Requirements

### Requirement: Live color palette
The system SHALL expose tokens for: brand primary navy `#02335e`, brand accent cyan `#00abf9`, page background `#f2f2f2`, gray background `#f9f9f9`, neutral light gray `#e7e7e7`, neutral-100 `#f8f9fa`, white, link/focus blue `#1e73be`, pastels sun `#f9eac6` / salmon `#ffd7d7` / sky `#c1e7f5`, rich-text table border `#dce4ec`, rich-text table note text `#7c878f`, and system status pairs (success `#cef5ca`/`#114e0b`, warning `#fcf8d8`/`#5e5515`, error `#f8e4e4`/`#3b0b0b`).

#### Scenario: Default body colors
- **WHEN** any page renders body text with no section override
- **THEN** text uses the navy primary and the page background uses `#f2f2f2`

#### Scenario: Focus state
- **WHEN** a keyboard user focuses a link, button, or field
- **THEN** a visible focus indicator uses the focus-blue token

#### Scenario: Table colors from tokens
- **WHEN** a rich-text table renders
- **THEN** its border, header and note colours come from the table-border, sky and table-note tokens, not hard-coded values
