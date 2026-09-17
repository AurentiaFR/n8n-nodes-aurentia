import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import * as listSearch from '../Aurentia/methods/listSearch';
import * as loadOptions from '../Aurentia/methods/loadOptions';
import {
	aurentiaApiRequest,
	aurentiaApiRequestPaged,
	aurentiaRecordsRequestPaged,
} from '../Aurentia/transport';

// A polling trigger has no execute() and cannot become an AI Agent tool, so
// `usableAsTool` is intentionally absent here. The lint rule only auto-exempts
// nodes that expose a non-Main AI output, which a Main-output trigger does not.
// eslint-disable-next-line @n8n/community-nodes/node-usable-as-tool -- trigger nodes are never tools
export class AurentiaTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Aurentia Trigger',
		name: 'aurentiaTrigger',
		icon: { light: 'file:../../icons/aurentia.svg', dark: 'file:../../icons/aurentia.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["event"]}}',
		description: 'Starts the workflow when something happens in Aurentia',
		defaults: { name: 'Aurentia Trigger' },
		polling: true,
		inputs: [],
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
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Contact Created', value: 'contactCreated' },
					{ name: 'Deal Created', value: 'dealCreated' },
					{ name: 'Post Published', value: 'postPublished' },
					{ name: 'Record Created', value: 'recordCreated' },
					{ name: 'Task Created', value: 'taskCreated' },
				],
				default: 'contactCreated',
			},
			// Project — used by Contact Created, Deal Created and Post Published.
			{
				displayName: 'Project',
				name: 'projectId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The Aurentia project to watch',
				displayOptions: {
					show: { event: ['contactCreated', 'dealCreated', 'postPublished'] },
				},
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'searchProjects', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[0-9a-fA-F-]{36}$',
									errorMessage: 'Not a valid UUID',
								},
							},
						],
					},
				],
			},
			// Board — used by Task Created.
			{
				displayName: 'Board',
				name: 'boardId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The task board to watch',
				displayOptions: { show: { event: ['taskCreated'] } },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'searchBoards', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[0-9a-fA-F-]{36}$',
									errorMessage: 'Not a valid UUID',
								},
							},
						],
					},
				],
			},
			// Base + Table — used by Record Created.
			{
				displayName: 'Base',
				name: 'baseId',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'The database (Base) that contains the table to watch',
				displayOptions: { show: { event: ['recordCreated'] } },
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						typeOptions: { searchListMethod: 'searchBases', searchable: true },
					},
					{
						displayName: 'By ID',
						name: 'id',
						type: 'string',
						placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: '^[0-9a-fA-F-]{36}$',
									errorMessage: 'Not a valid UUID',
								},
							},
						],
					},
				],
			},
			{
				displayName: 'Table Name or ID',
				name: 'tableId',
				type: 'options',
				typeOptions: { loadOptionsMethod: 'getTables', loadOptionsDependsOn: ['baseId.value'] },
				required: true,
				default: '',
				displayOptions: { show: { event: ['recordCreated'] } },
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	};

	methods = { listSearch, loadOptions };

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as string;
		const staticData = this.getWorkflowStaticData('node') as {
			lastTimeChecked?: string;
			seenIds?: string[];
			scope?: string;
		};
		const now = new Date().toISOString();
		const { items, timestampKey, scope } = await fetchForEvent.call(this, event);
		// Validate the whole scan BEFORE advancing any persistent state. An API
		// contract failure must not silently consume an event or reset a baseline.
		if (
			!Array.isArray(items) ||
			items.some((item) => !item || typeof item.id !== 'string' || !item.id)
		) {
			throw new NodeOperationError(this.getNode(), 'Aurentia returned an invalid event list', {
				description: 'Every event must have an ID. Retry the poll; no progress has been saved.',
			});
		}
		const unique = [...new Map(items.map((item) => [item.id as string, item])).values()];
		const byTime = (a: IDataObject, b: IDataObject) =>
			(Date.parse(String(a[timestampKey])) || 0) - (Date.parse(String(b[timestampKey])) || 0) ||
			String(a.id).localeCompare(String(b.id));

		if (this.getMode() === 'manual') {
			const sample = unique.sort(byTime).slice(-1);
			return sample.length ? [this.helpers.returnJsonArray(sample)] : null;
		}

		const sameScope = staticData.scope === scope;
		const migrating = !staticData.scope && Boolean(staticData.lastTimeChecked);
		const seen = new Set(sameScope || migrating ? (staticData.seenIds ?? []) : []);
		const fresh = unique
			.filter((item) => {
				if (seen.has(String(item.id))) return false;
				if (sameScope) return true;
				// Upgrade legacy workflows once, retaining their timestamp boundary.
				// Compare instants, not strings (Postgres offsets/precision differ).
				return (
					migrating &&
					Date.parse(String(item[timestampKey])) >= Date.parse(staticData.lastTimeChecked!)
				);
			})
			.sort(byTime);
		const result = fresh.length ? [this.helpers.returnJsonArray(fresh)] : null;
		for (const item of unique) seen.add(String(item.id));
		// Keep the ID ledger, including temporarily absent/deleted items. Cutting
		// it to 500 or replacing it with only this scan replays events after page
		// reordering. Storage scales with observed IDs in this watched scope.
		staticData.seenIds = [...seen];
		staticData.scope = scope;
		staticData.lastTimeChecked = now;
		return result;
	}
}

async function fetchForEvent(
	this: IPollFunctions,
	event: string,
): Promise<{ items: IDataObject[]; timestampKey: string; scope: string }> {
	if (event === 'taskCreated') {
		const boardId = this.getNodeParameter('boardId', undefined, { extractValue: true }) as string;
		const items = await aurentiaApiRequest.call(
			this,
			'GET',
			'/api/aurentia/tasks/cards',
			{},
			{ boardId },
		);
		return {
			items: items as unknown as IDataObject[],
			timestampKey: 'created_at',
			scope: `${event}:${boardId}`,
		};
	}
	if (event === 'recordCreated') {
		const tableId = this.getNodeParameter('tableId') as string;
		const items = await aurentiaRecordsRequestPaged.call(this, tableId, {}, true, 500);
		return { items, timestampKey: 'created_at', scope: `${event}:${tableId}` };
	}
	if (!['contactCreated', 'dealCreated', 'postPublished'].includes(event)) {
		throw new NodeOperationError(this.getNode(), 'Choose a supported Aurentia trigger event');
	}
	const projectId = this.getNodeParameter('projectId', undefined, { extractValue: true }) as string;
	const endpoint =
		event === 'contactCreated'
			? '/api/aurentia/crm/contacts'
			: event === 'dealCreated'
				? '/api/aurentia/crm/deals'
				: '/api/aurentia/social-media/posts';
	const qs: IDataObject = { projectId };
	if (event === 'contactCreated') Object.assign(qs, { sortBy: 'created_at', sortOrder: 'desc' });
	if (event === 'postPublished') qs.status = 'published';
	const items = await aurentiaApiRequestPaged.call(this, endpoint, qs, true, 100);
	return {
		items,
		timestampKey: event === 'postPublished' ? 'published_at' : 'created_at',
		scope: `${event}:${projectId}`,
	};
}
