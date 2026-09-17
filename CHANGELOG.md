# Changelog

## 0.4.1 — 2026-09-17

- Run CI and provenance publishing on Node.js 24, as required by the n8n 2.39.7 E2E runtime. The 0.4.0 publication stopped before npm upload because its runner used Node.js 22; 0.4.1 includes all 0.4.0 changes below.

## 0.4.0 — 2026-09-17

- Correct optional query aliases and query/body placement across generated operations.
- Parse optional JSON inputs and preserve explicit null/empty values in generated writes.
- Read every page in all five polling triggers; retain an ID ledger, migrate legacy cursors, reset on scope change, and leave state unchanged on incomplete/failed scans.
- Reject malformed or stalled pagination; recognize native n8n HTTP error shapes and preserve validation error types/item indices.
- Add five importable workflows, English/French setup guides, regression tests and real n8n execution tests against a local API simulator.
- Registry sync removes the retired public Feature Requests resource (list/submit/upvote). Replace feature suggestions with Feedback → Send Product Feedback, category `idea`. Other resource/operation identifiers are unchanged.
- Support requests derive the sender from the authenticated profile and work with both the previous and current support API contracts, without repeating an email send.

## 0.3.2 — 2026-09-16

- Synchronize generated operations with the September 16, 2026 Aurentia registry: 90 resources and 1,687 operations.
- Add `calendar.getCalendarEvent`, `import.getAiMemoryImportPrompt`, `messaging.inviteToConversation` and `tasksAdvanced.previewCardDelete`.
- No operation was removed and no input contract changed: upgrading from 0.3.1 is safe for existing workflows.

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
