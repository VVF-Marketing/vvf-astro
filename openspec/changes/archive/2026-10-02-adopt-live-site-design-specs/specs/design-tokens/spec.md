## REMOVED Requirements

### Requirement: Brand and accent color tokens match Figma variables
**Reason**: Superseded by `design-system` ("Live color palette"), whose tokens are mirrored from the live site's CSS variables and implemented in `tailwind.config.cjs`.
**Migration**: Use the `design-system` spec and the Design Token Reference docs page as the source for color tokens.

### Requirement: Typography tokens match Figma variables
**Reason**: Superseded by `design-system` ("Live typography"), which defines the same font roles (Nunito, Open Sans) plus the live type scale.
**Migration**: Use `design-system` for typography requirements.

### Requirement: Spacing, radius, and container tokens match Figma variables
**Reason**: Superseded by `design-system` ("Live shape, spacing, and container scales").
**Migration**: Use `design-system` for spacing, radius and container tokens.

### Requirement: Token documentation reflects the Figma source
**Reason**: Token documentation now traces each token to the live site's CSS variables (`design-system`, "Live-site token source of truth").
**Migration**: The generated Design Token Reference (`node scripts/docs-tokens.mjs`) is the token documentation.
