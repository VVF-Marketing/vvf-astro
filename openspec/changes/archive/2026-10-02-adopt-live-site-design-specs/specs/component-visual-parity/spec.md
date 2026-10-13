## REMOVED Requirements

### Requirement: Shared chrome matches its Figma reference
**Reason**: Superseded by `component-library` ("Live component parity", "Dropdown site navigation"), which matches Header, Footer and Hero to the live site.
**Migration**: Use `component-library` for shared chrome requirements.

### Requirement: Existing component library uses updated tokens
**Reason**: Superseded by `component-library` ("Live component parity"), which requires every component to use design-system tokens only.
**Migration**: Use `component-library`; the no-raw-hex rule is covered there.

### Requirement: New molecules required by the redesign exist in the library
**Reason**: The live site's equivalents already exist: Breadcrumbs (`component-library` "Breadcrumbs"), What/When/Where fact cards and step cards (implemented as library components during the migration).
**Migration**: Use `component-library` for new component requirements.
