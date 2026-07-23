/* eslint-disable n8n-nodes-base/node-filename-against-convention -- This is the shared node description module for the modular (Airtable v2) node structure, not the node class file itself. */
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodePropertyOptions, INodeTypeDescription } from 'n8n-workflow';

import * as account from './account/Account.resource';
import * as contact from './contact/Contact.resource';
import * as deal from './deal/Deal.resource';
import * as project from './project/Project.resource';
import * as record from './record/Record.resource';
import * as socialPost from './socialPost/SocialPost.resource';
import * as task from './task/Task.resource';
import { generatedProperties, generatedResourceOptions } from './generated/descriptions';

/** Curated resources — the hand-authored, premium-UX core. */
const curatedResourceOptions: INodePropertyOptions[] = [
	{ name: 'Account', value: 'account' },
	{ name: 'Contact', value: 'contact' },
	{ name: 'Deal', value: 'deal' },
	{ name: 'Project', value: 'project' },
	{ name: 'Record', value: 'record', description: 'A record in an Aurentia database (Bases)' },
	{ name: 'Social Post', value: 'socialPost' },
	{ name: 'Task', value: 'task' },
];

/**
 * Full Resource dropdown: curated + generated (the long tail from the MCP
 * registry), merged and sorted alphabetically by name (n8n UX convention).
 */
const resourceOptions: INodePropertyOptions[] = [
	...curatedResourceOptions,
	...generatedResourceOptions,
].sort((a, b) => a.name.localeCompare(b.name));

export const versionDescription: INodeTypeDescription = {
	displayName: 'Aurentia',
	name: 'aurentia',
	icon: { light: 'file:../../icons/aurentia.svg', dark: 'file:../../icons/aurentia.dark.svg' },
	group: ['transform'],
	version: 1,
	subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
	description: 'Consume the Aurentia API — CRM, tasks, databases, social media, and projects',
	defaults: { name: 'Aurentia' },
	usableAsTool: true,
	inputs: [NodeConnectionTypes.Main],
	outputs: [NodeConnectionTypes.Main],
	credentials: [
		{
			name: 'aurentiaApi',
			required: true,
			displayOptions: { show: { authentication: ['apiKey'] } },
		},
		{
			name: 'aurentiaOAuth2Api',
			required: true,
			displayOptions: { show: { authentication: ['oAuth2'] } },
		},
	],
	properties: [
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'options',
			options: [
				{ name: 'API Key', value: 'apiKey' },
				{ name: 'OAuth2', value: 'oAuth2' },
			],
			default: 'apiKey',
		},
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: resourceOptions,
			default: 'contact',
		},
		...account.description,
		...contact.description,
		...deal.description,
		...project.description,
		...record.description,
		...socialPost.description,
		...task.description,
		...generatedProperties,
	],
};
