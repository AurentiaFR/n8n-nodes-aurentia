# Changelog

## 0.3.1 — 2026-09-12

- Pass the official n8n scanner without inline lint suppressions: omit redundant generated option descriptions and keep node metadata in `Aurentia.node.ts`.
- Preserve the previous description-module export and all workflow resource/operation identifiers.
- Lint action-node and credential source with inline rule overrides disabled, matching the scanner.

## 0.3.0 — 2026-09-12

- Synchronize generated operations with the September 12, 2026 Aurentia registry: 90 generated resources and 1,683 operations, plus the curated core.
- Add the missing website, visibility, Reddit, monitoring, messaging and agent actions; update existing input contracts and descriptions.
- Mask generated API key, password, secret and token inputs, including nested optional fields.
- Normalize boolean field descriptions consistently with other generated fields.
- Validate generation, compilation, execution, coverage and lint in the monorepo CI.
- The upstream `projectsAdvanced.validateCategorySynthesis` operation was removed; workflows using it must be revised before upgrading.
