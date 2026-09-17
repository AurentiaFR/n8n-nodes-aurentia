# E2E checklist — `@aurentiaai/n8n-nodes-aurentia`

First run `npm run build && npm test && npm run test:e2e`. The automated gate
imports and runs all five templates in real n8n against an HTTP simulator.
Then run this checklist against a live Aurentia test account: the simulator
does not prove production authorization, OAuth consent, refresh or API behavior.

## Setup

1. Start Aurentia locally from `develop` (companion endpoints `/api/aurentia/me`
   + OAuth consent/clients must be present): `pnpm dev` → `http://app.localhost:3000`.
2. Seed a test account and, in **Settings > Integrations**, generate an API key
   (`aur_…`). For OAuth, also register an OAuth client with the callback
   `http://localhost:5678/rest/oauth2-credential/callback`.
3. In `packages/n8n-nodes-aurentia`: `npm install && npm run dev` → n8n on
   `http://localhost:5678` with the node loaded (hot reload).
4. In n8n, create an **Aurentia API** credential with Base URL
   `http://app.localhost:3000` and the `aur_` key.

## Credential & auth

- [ ] Credential test succeeds with a valid key; fails with a clear
      "Authentication did not succeed" message on an invalid key.
- [ ] OAuth2: create an **Aurentia OAuth2 API** credential → Connect my account
      → Aurentia login → **consent screen shows the redirect host** → Authorize →
      credential connected. Refuse once → n8n reports `access_denied` cleanly.
- [ ] Revoke the OAuth client in Aurentia → verify the expected token revocation
      behavior against the authorization server. OAuth uses `mcp_at_*` access
      tokens and `mcp_rt_*` refresh tokens, not an `aur_` key. Expire an access
      token and verify refresh succeeds before revocation and fails afterwards.

## Curated resources (both auth methods for at least Contact)

- [ ] Account: Get Profile, Get Credit Balance.
- [ ] Contact: Create (validation error if first/last/company all empty) → Get
      (Simplify on/off) → Get Many (search filter, sort, Return All > 100) →
      Update → Delete → `{ "deleted": true }`.
- [ ] Deal: Create (contact picker scoped to the chosen project) → Update
      (stage dropdown) → Get Many → Delete.
- [ ] Task: Create (column picker scoped to the chosen board) → Get Many (board
      scope + project scope) → Update (status) → Delete.
- [ ] Record: Create (Define Below AND JSON modes) → Get Many (Simplify =
      cells keyed by field name) → Update → Delete.
- [ ] Social Post: Create (notice shown) → Schedule (post shows "scheduled" in
      Aurentia AND is dispatched to Bundle.social) → Publish now on a 2nd post →
      Get Many (status filter) → Delete.
- [ ] Project: Get Many → Get → Update → Archive (on a throwaway project).

## Generated coverage (spot checks)

- [ ] One GET per a few generated resources (e.g. Dashboard, Finance, Drive,
      Assistant) returns data.
- [ ] One generated write op (e.g. Notes create) succeeds.
- [ ] A credit-consuming op with an empty balance returns a clean
      "Not enough Aurentia credits" error (402 mapped), not a raw failure.

## Robustness

- [ ] Multi-item: 3 items into Contact: Create → 3 contacts, correct pairedItem.
- [ ] continueOnFail: one invalid item in the middle → the other two pass, the
      failed item carries `{ error }`.

## Trigger

- [ ] Each of the 5 events: activate, create the object in Aurentia, verify it
      is emitted on the next poll; re-poll → no duplicate; more than 100 contacts/deals/tasks, 50 posts and 1,000 records → all new
      items, chronological order; manual mode → newest sample across pages.
- [ ] Fail a later API page → no cursor advancement; retry recovers all items.
- [ ] Restart n8n → no replay; change watched scope → fresh baseline.
- [ ] An object with a delayed/older timestamp still emits once when first observed.

## AI tool

- [ ] Attach the Aurentia node to an AI Agent's tool input →
      *"create a contact Jane Doe at ACME in project X"* works.

## Build hygiene (also run in CI)

- [ ] `npm run generate:check` green (determinism + build + validate + executor).
- [ ] `npm run lint` green; icons render in light + dark.
