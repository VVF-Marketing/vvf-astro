## Why

Two design specs now coexist in `openspec/specs/`. The Figma "VVF 2.0 Phase 1" track (`design-tokens`, `component-visual-parity`, `page-section-parity`) was synced as a requirements contract only (1 of 28 tasks done). Meanwhile the Webflow migration (archived `2026-10-03-migrate-webflow-site`) implemented and verified the design against the live site (`design-system`, `component-library`, `front-end`). Keeping both leaves two conflicting sources of truth for tokens, components and page layout. The live-site specs are the ones the code meets and tests, so they become the default.

## What Changes

- **BREAKING (specs only):** retire the Figma VVF 2.0 capabilities `design-tokens`, `component-visual-parity` and `page-section-parity` by removing all their requirements. Their main specs are deleted on archive.
- `design-system`, `component-library` and `front-end` (sourced from the live site) remain the default design specs. No requirement changes there.
- No code changes: nothing in the codebase or docs depends on the retired specs.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `design-tokens`: all requirements removed (superseded by `design-system`).
- `component-visual-parity`: all requirements removed (superseded by `component-library`).
- `page-section-parity`: all requirements removed (superseded by `front-end`).

## Impact

- `openspec/specs/design-tokens/`, `openspec/specs/component-visual-parity/` and `openspec/specs/page-section-parity/` are deleted.
- The remote branch `origin/sync-figma-vvf2-design-specs` and any unfinished Figma VVF 2.0 work are not touched. If that work resumes, it should be re-proposed against `design-system` / `component-library` / `front-end`.
- The separate `add-figma-code-connect` proposal (another branch) is unaffected.
