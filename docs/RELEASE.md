# Release runbook — `n8n-nodes-aurentia`

The node is developed **inside the private monorepo** (`packages/n8n-nodes-aurentia/`).
The public repo `AurentiaFR/n8n-nodes-aurentia` is a **publication mirror** kept in
sync by `scripts/sync-n8n-node.mjs`. npm publish happens from the mirror via
GitHub Actions with provenance (required for n8n Cloud verification).

## Preconditions (must be true before publishing)

1. **Companion endpoints live in prod.** The credential test hits
   `GET /api/aurentia/me`, and OAuth uses the consent screen + OAuth-clients UI.
   All of these must be on `main` (prod) before the first npm publish, or early
   users hit failures. → merge `develop` → `main` and deploy.
2. **Gates green** in `packages/n8n-nodes-aurentia`:
   `npm run generate:check` and `npm run lint`.
3. **E2E checklist** (`docs/e2e-checklist.md`) executed against a local stack.
4. **npm Trusted Publisher configured** (one-time, done in the npm web UI by a
   maintainer): npmjs.com → the `n8n-nodes-aurentia` package → *Settings > Publishing
   access > Trusted Publishers* → add GitHub Actions, owner `AurentiaFR`, repo
   `n8n-nodes-aurentia`, workflow `publish.yml`. (Fallback: set an `NPM_TOKEN`
   repo secret on the mirror.) The first publish may need a manual `npm publish`
   to create the package before Trusted Publisher can be attached.

## Cut a release

From the monorepo root:

```bash
# 1. Bump the version in packages/n8n-nodes-aurentia/package.json
#    and add a CHANGELOG entry. Commit to develop, PR → main, deploy.

# 2. Push the full node to the public mirror AND tag it (the tag triggers
#    the mirror's provenance publish workflow):
node scripts/sync-n8n-node.mjs --tag
```

`sync-n8n-node.mjs` copies the package (excluding build output, deps, and the
generation-time tooling), strips the monorepo-only npm scripts, runs a guard
that aborts if any monorepo reference leaked, pushes `main`, then pushes the
version tag. The mirror's `publish.yml` runs on the tag and publishes to npm
with `--provenance`.

Use `--dry-run` first to preview what would change.

## After publishing

1. Install on a clean self-hosted n8n (Docker): **Settings > Community Nodes >
   Install** `n8n-nodes-aurentia` → smoke test credential + a few ops + a trigger.
2. Run the scanner n8n uses at vetting:
   `npx @n8n/scan-community-package n8n-nodes-aurentia` (resolves the *published*
   package, so it only works post-publish).
3. Submit for verification at <https://creators.n8n.io/nodes> (n8n account
   login required). Approval is an external delay (7 days–1 month). Save the
   confirmation screenshot in this folder.

## Ongoing: keep the node in sync (Zero-Tolerance 4th axis)

Any change to the Aurentia MCP registry (`lib/mcp/tool-definitions.ts`) must be
followed, in the same delivery, by `npm run generate` here. CI enforces
determinism via `npm run generate:check`. This keeps the node a faithful mirror
of the product surface — it never drifts behind.
