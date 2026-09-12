import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';

import { router } from './actions/router';
import * as listSearch from './methods/listSearch';
import * as loadOptions from './methods/loadOptions';

import * as account from './actions/account/Account.resource';
import * as contact from './actions/contact/Contact.resource';
import * as deal from './actions/deal/Deal.resource';
import * as project from './actions/project/Project.resource';
import * as record from './actions/record/Record.resource';
import * as socialPost from './actions/socialPost/SocialPost.resource';
import * as task from './actions/task/Task.resource';
import { generatedProperties, generatedResourceOptions } from './actions/generated/descriptions';

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

export class Aurentia implements INodeType {
	description: INodeTypeDescription = {
		...versionDescription,
		icon: {
			light: 'file:../../icons/aurentia.svg',
			dark: 'file:../../icons/aurentia.dark.svg',
		},
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		usableAsTool: true,
	};

	methods = { listSearch, loadOptions };

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const responseData = await router.call(this, resource, operation, i);
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex: i });
			}
		}
		return [returnData];
	}
}
