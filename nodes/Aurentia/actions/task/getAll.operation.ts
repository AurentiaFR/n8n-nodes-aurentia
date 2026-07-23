import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { boardLocator, projectLocator, simplifyToggle } from '../common.descriptions';
import { pickFields } from '../../helpers/utils';

const SIMPLIFY_FIELDS = [
	'id',
	'title',
	'status',
	'priority',
	'due_date',
	'board_id',
	'column_id',
	'assigned_to',
	'created_at',
];

const scopedBoardLocator: INodeProperties = {
	...boardLocator,
	displayOptions: { show: { scope: ['board'] } },
};

const scopedProjectLocator: INodeProperties = {
	...projectLocator,
	displayOptions: { show: { scope: ['project'] } },
};

export const description: INodeProperties[] = [
	{
		displayName: 'Scope',
		name: 'scope',
		type: 'options',
		options: [
			{ name: 'Board', value: 'board', description: 'List tasks from a single board' },
			{
				name: 'Project',
				value: 'project',
				description: 'List tasks across all boards of a project',
			},
		],
		default: 'board',
	},
	scopedBoardLocator,
	scopedProjectLocator,
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Column Name or ID',
				name: 'columnId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getColumns',
					loadOptionsDependsOn: ['boardId.value'],
				},
				default: '',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Overdue',
				name: 'overdue',
				type: 'boolean',
				default: false,
				description: 'Whether to return only tasks that are past their due date',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'multiOptions',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
					{ name: 'Urgent', value: 'urgent' },
				],
				default: [],
			},
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search in task titles and descriptions',
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				options: [
					{ name: 'Backlog', value: 'backlog' },
					{ name: 'Blocked', value: 'blocked' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'In Progress', value: 'in_progress' },
					{ name: 'To Do', value: 'todo' },
				],
				default: [],
				description: 'Filter by task status (applied after fetching)',
			},
		],
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const scope = this.getNodeParameter('scope', i, 'board') as string;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	// The C13 cards endpoint accepts `status` only as a client-side concept: the
	// route has no `status` query param, so it is filtered here after fetching.
	const { status, ...serverFilters } = filters;

	const qs: IDataObject = { ...serverFilters };
	if (scope === 'project') {
		qs.projectId = this.getNodeParameter('projectId', i, undefined, {
			extractValue: true,
		}) as string;
	} else {
		qs.boardId = this.getNodeParameter('boardId', i, undefined, {
			extractValue: true,
		}) as string;
	}

	// C13: GET /api/aurentia/tasks/cards returns data as a direct array (no pagination).
	const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/tasks/cards', {}, qs);
	let cards = (res as unknown as IDataObject[]) ?? [];

	const statusFilter = Array.isArray(status) ? (status as string[]) : [];
	if (statusFilter.length > 0) {
		cards = cards.filter((c) => statusFilter.includes(String(c.status ?? '')));
	}

	cards = cards.slice(0, limit);

	return simplify ? cards.map((c) => pickFields(c, SIMPLIFY_FIELDS)) : cards;
}
