# Five ready-to-import workflows

[Guide français](WORKFLOWS.fr.md)

**Upgrading to 0.4.0:** the Aurentia registry retired the public **Feature
Requests** resource (list, submit, upvote). Replace feature suggestions with
**Feedback → Send Product Feedback**, category `idea`. Other operation identifiers
remain stable. Support reads the authenticated profile to work with both the
previous and current API contracts.

Install `@aurentiaai/n8n-nodes-aurentia`, then in n8n choose **Import from File**
and select one of the JSON files below. All templates are inactive and contain
no credentials. Select your Aurentia credential on **each** Aurentia action or
trigger, replace the example IDs in **Configuration** (or pick the project on
the trigger), test, then activate. IDs beginning `00000000-` are placeholders.
For OAuth, change Authentication to OAuth2 and select your OAuth credential.

Start with the seven core resources: Account, Contact, Deal, Project, Record,
Social Post and Task. They include searchable pickers and pagination. The other
resources expose advanced API operations; their JSON fields accept valid JSON
or an n8n expression returning an object/array. Select only the optional fields
you want to send. An explicit empty string or null in a generated write is sent
to the API, allowing a field to be cleared when that API permits it. Leaving
the optional field out leaves the existing value unchanged.

| Template | Configure | Result |
| --- | --- | --- |
| [Lead form → CRM](../examples/01-lead-to-crm.json) | Project, task board, column; credential on three actions | A form submission creates a contact, linked deal and follow-up task. |
| [Contact → follow-up](../examples/02-contact-follow-up.json) | Project on the trigger; task board and column | Each newly observed contact creates a follow-up task. |
| [Weekly pipeline](../examples/03-weekly-pipeline.json) | Project; credentials on both actions | Every Monday at 09:00 Europe/Paris, all deals become a project wiki note, including an empty-pipeline summary. Amounts retain their original currencies. |
| [Publication → notification](../examples/04-post-notification.json) | Project; notification webhook accepting `{ "text": "…" }` | Notify a team endpoint, such as a Slack incoming webhook, when a post is first observed as published. |
| [Table → JSON](../examples/05-table-export.json) | Base and table IDs | Every Monday, export every row to `aurentia-records.json`, preserving field IDs. Download it from the execution output or connect a storage node for retention. Empty tables produce no file. |

For confidential webhook URLs, move the URL out of Configuration into your n8n
secret store before sharing/exporting the workflow. No AI model is required by
these five workflows. Separate Aurentia AI operations may consume credits.

## Polling and retries

- Activation establishes a baseline without emitting existing records. A
  manual test returns the newest available sample across all pages and does
  not alter the active polling state.
- Each scheduled poll reads every page, then emits unseen IDs in chronological
  order. The trigger retains observed IDs, including temporarily absent ones;
  large batches and delayed/older timestamps do not silently disappear.
- A failed or malformed page fails the entire poll without advancing its
  state. Fix the error and let the next poll retry. Existing workflows using
  the old timestamp cursor migrate on their first complete poll.
- Changing the watched project, board, table or event establishes a new baseline.
- This is polling, not an event log: objects created and deleted between polls
  cannot be observed. A repeated publication of an already observed post ID
  does not emit again. API page reads are not a transactional snapshot.
- Reading all pages costs API requests proportional to the source size;
  persisted state grows with observed IDs. Choose an interval appropriate to
  your volume. Rate limiting fails visibly and preserves progress. There is a
  10,000-page safety limit; reaching it fails rather than truncating results.
- Downstream workflow failures use n8n execution retries. Replaying a successful
  create step may create duplicates: writes are not automatically retried by
  this package. Resume at the failed step where possible.

## Verification

`npm run build && npm test` checks catalog contracts, optional query mappings,
JSON values, pagination, triggers, item links and template structure.
`npm run test:e2e` imports the workflows and API-key/OAuth credentials into a
temporary n8n 2.39.7 instance and executes their business steps against a local
HTTP simulator. External form/schedule/poll inputs are replaced with fixtures;
the shipped expressions and action nodes execute unchanged. OAuth bearer
authentication is exercised, not the interactive authorization/refresh flow.
No production account, message delivery or paid generation is involved.

Use [the live checklist](e2e-checklist.md) for login/consent, token refresh and
real Aurentia API validation before a release. Passing local tests does not
publish a new npm version or imply n8n Cloud approval.
