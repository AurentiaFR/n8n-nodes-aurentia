/* eslint-disable n8n-nodes-base/node-filename-against-convention -- This is the shared node description module for the modular (Airtable v2) node structure, not the node class file itself. */
import { NodeConnectionTypes } from 'n8n-workflow';
import type { INodeTypeDescription } from 'n8n-workflow';

import * as account from './account/Account.resource';

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
	credentials: [{ name: 'aurentiaApi', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [{ name: 'Account', value: 'account' }],
			default: 'account',
		},
		...account.description,
	],
};
