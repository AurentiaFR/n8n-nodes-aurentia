# Changelog

## 0.3.0 — 2026-09-12

- Synchronize generated operations with the September 12, 2026 Aurentia registry: 90 generated resources and 1,683 operations, plus the curated core.
- Add the missing website, visibility, Reddit, monitoring, messaging and agent actions; update existing input contracts and descriptions.
- Mask generated API key, password, secret and token inputs, including nested optional fields.
- Normalize boolean field descriptions consistently with other generated fields.
- Validate generation, compilation, execution, coverage and lint in the monorepo CI.
- The upstream `projectsAdvanced.validateCategorySynthesis` operation was removed; workflows using it must be revised before upgrading.
