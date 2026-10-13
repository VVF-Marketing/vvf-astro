## REMOVED Requirements

### Requirement: Section composition matches Figma per page type
**Reason**: Superseded by `front-end` ("Page parity with live site"), which requires each page to follow the live site's section order and copy.
**Migration**: Use `front-end` for page composition requirements.

### Requirement: Vertical spacing follows the Figma padding scale
**Reason**: The live site's spacing (120px desktop / 64px phone sections) is implemented through `design-system` tokens and verified by the visual parity check (`site-migration`, "Visual parity check").
**Migration**: Use `design-system` and the parity check for spacing.

### Requirement: Phase 2 content is excluded
**Reason**: Scope is now defined by the live site (`front-end`); Figma phases no longer apply.
**Migration**: None needed.
