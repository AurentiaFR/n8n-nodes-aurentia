# n8n-nodes-aurentia

This is an n8n community node. It lets you use [Aurentia](https://aurentia.fr) in your n8n workflows.

Aurentia is the AI-native business OS for entrepreneurs — CRM, tasks, databases, social media, projects, finance, a website builder, AI agents and more, all in one place.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[AI Agent tool usage](#ai-agent-tool-usage)
[Trigger](#trigger)
[Resources](#resources)
[Development](#development)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/) in the n8n community nodes documentation.

- **Self-hosted:** **Settings > Community Nodes > Install** and enter `n8n-nodes-aurentia`.
- **n8n Cloud:** once the node is verified, search for **Aurentia** directly in the nodes panel.

## Operations

The package ships two nodes: **Aurentia** (actions) and **Aurentia Trigger** (polling events).

### Curated core resources

Seven hand-built resources with the richest UX (searchable resource pickers, "Simplify" output, "Return All" pagination):

- **Account** — Get Profile, Get Credit Balance
- **Contact** (CRM) — Create, Get, Get Many, Update, Delete
- **Deal** (CRM) — Create, Get, Get Many, Update, Delete
- **Project** — Get, Get Many, Update, Archive
- **Record** (Bases / databases) — Create, Get, Get Many, Update, Delete
- **Social Post** — Create, Get, Get Many, Update, Delete, Schedule, Publish
- **Task** (Kanban) — Create, Get, Get Many, Update, Delete

### Full Aurentia coverage

Beyond the curated core, the node exposes **the entire Aurentia API** — every capability available to Aurentia's own AI agents and bots is available here too. These operations are generated from Aurentia's internal tool registry, so the node always mirrors the live product. Current coverage: **58 additional resources, 766 operations**, including:

Agents · Assistant & conversations · Automations · Booking & calendar · Brand DNA & brand identity · Clips · Close (sales calls) · Collaborators · CRM (advanced) · Dashboard · Drive · Email · Finance & forecasting · Forms · Import · Integrations · Marketplace · Missions · Modules · Notes · Notifications · Playbooks · Projects (advanced, incl. create) · Prospection · Quotes & contracts · Recommended tools · Resources · Routines · Site builder · Social media (advanced) · Tasks (advanced) · Tools · Whiteboards · Workspace databases · and more.

> Some generated operations trigger AI generation and **consume Aurentia credits** (documents, media, prospection, agent runs). When your balance is empty the node returns a clear, actionable error.

## Credentials

You need an Aurentia account. The node offers two authentication methods (select one on the node's **Authentication** field):

### API key (simplest)

1. In Aurentia, open **Settings > Integrations**.
2. Generate an API key (starts with `aur_`). It is shown once — copy it.
3. In n8n, create an **Aurentia API** credential and paste the key.

The **Base URL** defaults to `https://app.aurentia.fr` and normally does not need changing (use `http://app.localhost:3000` only for local development).

### OAuth2 (no key to copy/paste)

1. In Aurentia, open **Settings > Integrations > OAuth clients** and register a client with your n8n instance's callback URL (shown in the n8n credential screen, e.g. `https://<your-n8n>/rest/oauth2-credential/callback`). You receive a **Client ID** and **Client Secret** (the secret is shown once).
2. In n8n, create an **Aurentia OAuth2 API** credential, paste the Client ID/Secret, and click **Connect my account**. You will be asked to authorize the connection in Aurentia.

Both methods carry the same permissions — an Aurentia credential can access everything your account can. You can revoke an API key or an OAuth client at any time from **Settings > Integrations**.

## Compatibility

Tested against n8n **2.x**. Requires Node.js 22+.

For **AI Agent tool usage**: on n8n 2.x no extra configuration is needed. On n8n 1.x (>= 1.79), set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` on the instance.

## Usage

> **This node is data-in / data-out — never interactive.** Every operation is a
> plain API call (the same surface Aurentia's own AI agents use). There is no
> onboarding, wizard or UI step: anything the app walks a human through, you do
> here as a sequence of data operations.

**Capture a lead from a form into your CRM**
Form Trigger → **Aurentia: Contact – Create** (pick your project, map name/email) → **Aurentia: Deal – Create** (link the new contact, set a title) → **Aurentia: Task – Create** (a follow-up card).

**Announce a published post**
**Aurentia Trigger** (Post Published) → your Discord/Slack/email node with the post link.

**Weekly pipeline digest**
Schedule Trigger (Mondays) → **Aurentia: Deal – Get Many** (Return All) → your email node with a summary.

**Create a project and generate its content — no onboarding**
The app's project onboarding is just a UI over the API. From n8n it is a data flow:
**Aurentia: Create Project** (send name + one-sentence idea + optional details → returns the project id) → **Aurentia: Generate Project Modules** (and/or Generate Markets / Targets / Category) → poll **Aurentia: Get Generation Status** until ready. Same content, same power, zero clicks.

## AI Agent tool usage

The **Aurentia** action node is `usableAsTool: true`: connect it to an **AI Agent** node's tool input and the agent can operate Aurentia in natural language — e.g. *"create a contact Jane Doe at ACME in project X, then add a follow-up task"*. On n8n 1.x, enable `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` (see [Compatibility](#compatibility)).

## Trigger

The **Aurentia Trigger** node polls Aurentia and starts your workflow on:

- New Contact, New Deal, New Task, New Base Record, Post Published.

Polling means latency equals your poll interval; each poll inspects the most recent items and de-duplicates against what it has already emitted. Items created and deleted between two polls are not seen.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Aurentia](https://aurentia.fr)

## Development

```bash
npm install
npm run dev          # builds + runs a local n8n on :5678 with the node loaded (hot reload)
npm run lint         # official n8n community-node linter
npm run build        # compile + copy icons into dist/
npm run generate     # regenerate the full-coverage operations from the Aurentia tool registry
npm run generate:check   # generate + determinism + build + validate + executor tests
```

The curated resources live in `nodes/Aurentia/actions/<resource>/`; the generated ones in `nodes/Aurentia/actions/generated/` (do not edit by hand — run `npm run generate`).

## Version history

### 0.1.0

- Initial release. Two nodes (**Aurentia**, **Aurentia Trigger**), API key + OAuth2 authentication, curated core (7 resources) plus full generated coverage (58 resources / 766 operations), `usableAsTool` support.
