import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { boardLocator } from '../common.descriptions';
import { cleanBody, csvToArray } from '../../helpers/utils';

export const description: INodeProperties[] = [
	boardLocator,
	{
		displayName: 'Column Name or ID',
		name: 'columnId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getColumns',
			loadOptionsDependsOn: ['boardId.value'],
		},
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Draft the launch checklist',
		description: 'The title of the task',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 4 },
				default: '',
			},
			{
				displayName: 'Due Date',
				name: 'due_date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Estimated Minutes',
				name: 'estimated_minutes',
				type: 'number',
				typeOptions: { minValue: 1, maxValue: 43200 },
				default: 60,
				description: 'Estimated time to complete the task, in minutes',
			},
			{
				displayName: 'Important',
				name: 'is_important',
				type: 'boolean',
				default: false,
				description: 'Whether to flag the task as important',
			},
			{
				displayName: 'Labels',
				name: 'labels',
				type: 'string',
				default: '',
				placeholder: 'e.g. launch, urgent',
				description: 'Comma-separated list of labels',
			},
			{
				displayName: 'Priority',
				name: 'priority',
				type: 'options',
				options: [
					{ name: 'Low', value: 'low' },
					{ name: 'Medium', value: 'medium' },
					{ name: 'High', value: 'high' },
					{ name: 'Urgent', value: 'urgent' },
				],
				default: 'medium',
			},
			{
				displayName: 'Urgent',
				name: 'is_urgent',
				type: 'boolean',
				default: false,
				description: 'Whether to flag the task as urgent',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const boardId = this.getNodeParameter('boardId', i, undefined, {
		extractValue: true,
	}) as string;
	const columnId = this.getNodeParameter('columnId', i) as string;
	const title = this.getNodeParameter('title', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

	if (typeof additionalFields.labels === 'string') {
		additionalFields.labels = csvToArray(additionalFields.labels);
	}

	const body = cleanBody({
		boardId,
		columnId,
		title,
		...additionalFields,
	});

	return aurentiaApiRequest.call(this, 'POST', '/api/aurentia/tasks/cards', body);
}
