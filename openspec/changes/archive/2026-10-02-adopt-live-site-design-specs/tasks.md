## 1. Retire the Figma design specs

- [x] 1.1 Confirm nothing in code, docs or other specs depends on `design-tokens`, `component-visual-parity` or `page-section-parity` (grep of `src/`, `docs-site/src/`, `AGENTS.md`, `CLAUDE.md`, `README.md`, `openspec/specs/` finds only the specs themselves)
- [x] 1.2 Write REMOVED deltas for every requirement of the three capabilities, each with Reason and Migration pointing to `design-system`, `component-library` or `front-end`; verify `openspec validate adopt-live-site-design-specs --strict` passes
- [x] 1.3 Archive the change with spec sync; verify the three main specs are deleted and `openspec validate --specs --strict` passes for the remaining specs
