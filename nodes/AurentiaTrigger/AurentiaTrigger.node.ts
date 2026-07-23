import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import * as listSearch from '../Aurentia/methods/listSearch';
import * as loadOptions from '../Aurentia/methods/loadOptions';
import { aurentiaApiRequest } from '../Aurentia/transport';

const MAX_SEEN_IDS = 500;

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
		};
		const now = new Date().toISOString();
		const isManual = this.getMode() === 'manual';
		const since = staticData.lastTimeChecked ?? now;

		const { items, timestampKey } = await fetchForEvent.call(this, event, isManual);

		if (isManual) {
			// Manual test run: emit a single sample item and leave the cursor untouched.
			const sample = [...items]
				.sort((a, b) =>
					String(b[timestampKey] ?? '').localeCompare(String(a[timestampKey] ?? '')),
				)
				.slice(0, 1);
			return sample.length ? [this.helpers.returnJsonArray(sample)] : null;
		}

		const seen = new Set(staticData.seenIds ?? []);
		const fresh = items
			.filter(
				(item) =>
					String(item[timestampKey] ?? '') > since && !seen.has(String(item.id)),
			)
			.sort((a, b) =>
				String(a[timestampKey] ?? '').localeCompare(String(b[timestampKey] ?? '')),
			);

		staticData.lastTimeChecked = now;
		staticData.seenIds = [...(staticData.seenIds ?? []), ...fresh.map((f) => String(f.id))].slice(
			-MAX_SEEN_IDS,
		);

		return fresh.length ? [this.helpers.returnJsonArray(fresh)] : null;
	}
}

async function fetchForEvent(
	this: IPollFunctions,
	event: string,
	isManual: boolean,
): Promise<{ items: IDataObject[]; timestampKey: string }> {
	const limit = isManual ? 1 : 100;

	if (event === 'contactCreated') {
		const projectId = this.getNodeParameter('projectId', undefined, {
			extractValue: true,
		}) as string;
		// C3: newest-first list, envelope data: { data: Contact[], total }.
		const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/crm/contacts', {}, {
			projectId,
			limit,
			sortBy: 'created_at',
			sortOrder: 'desc',
		});
		return { items: (res.data as IDataObject[]) ?? [], timestampKey: 'created_at' };
	}

	if (event === 'dealCreated') {
		const projectId = this.getNodeParameter('projectId', undefined, {
			extractValue: true,
		}) as string;
		// C6: envelope data: { data: Deal[], total }, sorted created_at DESC by default.
		const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/crm/deals', {}, {
			projectId,
			limit,
		});
		return { items: (res.data as IDataObject[]) ?? [], timestampKey: 'created_at' };
	}

	if (event === 'taskCreated') {
		const boardId = this.getNodeParameter('boardId', undefined, {
			extractValue: true,
		}) as string;
		// C13: cards come back as a direct array ordered by display_order ASC (not by
		// date) and the endpoint has no server-side pagination, so we fetch the whole
		// board and sort/window client-side by created_at DESC. The seenIds dedup +
		// cursor make this safe against duplicates; only cards beyond the newest 100
		// created between two polls could be missed (documented in the README).
		const cards = (await aurentiaApiRequest.call(
			this,
			'GET',
			'/api/aurentia/tasks/cards',
			{},
			{ boardId },
		)) as unknown as IDataObject[];
		const windowed = [...cards]
			.sort((a, b) =>
				String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')),
			)
			.slice(0, limit);
		return { items: windowed, timestampKey: 'created_at' };
	}

	if (event === 'recordCreated') {
		const tableId = this.getNodeParameter('tableId') as string;
		// C18: envelope data: { records: [...], total, limit, offset } — read `records`.
		const res = await aurentiaApiRequest.call(
			this,
			'GET',
			`/api/aurentia/bases/tables/${tableId}/records`,
			{},
			{ limit: isManual ? 1 : 1000 },
		);
		return { items: (res.records as IDataObject[]) ?? [], timestampKey: 'created_at' };
	}

	// postPublished
	const projectId = this.getNodeParameter('projectId', undefined, {
		extractValue: true,
	}) as string;
	// C21: envelope data: { data: Post[], total, page, limit }.
	const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/social-media/posts', {}, {
		projectId,
		status: 'published',
		limit: isManual ? 1 : 50,
	});
	return { items: (res.data as IDataObject[]) ?? [], timestampKey: 'published_at' };
}
