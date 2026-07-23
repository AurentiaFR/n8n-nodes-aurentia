# n8n-nodes-aurentia

This is an n8n community node. It lets you use [Aurentia](https://aurentia.fr) in your n8n workflows.

Aurentia is the AI-native business OS for entrepreneurs — CRM, tasks, databases, social media, and projects, all in one place.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[AI Agent tool usage](#ai-agent-tool-usage)
[Resources](#resources)
[Development](#development)
[Version history](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation-and-management/) in the n8n community nodes documentation.

On a self-hosted instance: **Settings > Community Nodes > Install** and enter `n8n-nodes-aurentia`.

## Operations

The **Aurentia** node currently supports the following resource and operations. More resources (Contact, Deal, Project, Task, Record, Social Post) and an **Aurentia Trigger** node are on the way.

### Account

- **Get Profile** — retrieve your account profile.
- **Get Credit Balance** — retrieve your account credit balance.

## Credentials

You authenticate with an Aurentia API key.

1. Sign in to Aurentia.
2. Go to **Settings > Integrations** and generate an API key. It starts with `aur_`.
3. In n8n, create an **Aurentia API** credential and paste the key.

Notes:

- The API key gives access to your full Aurentia API surface. Keep it secret and revoke it from **Settings > Integrations** if it leaks.
- Only one API key is active per account. Generating a new key revokes the previous one.
- The **Base URL** defaults to `https://app.aurentia.fr`. Change it only to target a local or staging instance.

## Compatibility

Tested against n8n v2.x. Using the node as an AI tool requires no flag on n8n 2.x. On n8n 1.x, set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true` on the instance.

## Usage

Add the **Aurentia** node to a workflow, select the **Account** resource, and pick an operation. For example, **Get Credit Balance** returns your current balance so a downstream node can alert you when credits run low.

## AI Agent tool usage

This node is usable as a tool by n8n AI Agents (`usableAsTool`). An agent can call Aurentia operations directly — for example, to read your account profile or credit balance. On n8n 1.x, the instance must set `N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE=true`; on 2.x no flag is needed.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Aurentia](https://aurentia.fr)

## Development

```sh
npm install
npm run dev    # builds the node and starts a local n8n on http://localhost:5678 with hot reload
npm run lint
npm run build
```

To develop against a local Aurentia instance, set the credential **Base URL** to `http://app.localhost:3000`.

## Version history

- **0.1.0** — Initial scaffold: Aurentia node with the Account resource (Get Profile, Get Credit Balance) and the `aurentiaApi` credential.
