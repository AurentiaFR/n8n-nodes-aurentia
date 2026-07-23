import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { cleanBody, csvToArray } from '../../helpers/utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the task to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
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
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Backlog', value: 'backlog' },
					{ name: 'Blocked', value: 'blocked' },
					{ name: 'Completed', value: 'completed' },
					{ name: 'In Progress', value: 'in_progress' },
					{ name: 'To Do', value: 'todo' },
				],
				default: 'todo',
				description: 'Moving the task to a status also moves it to the matching board column',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Draft the launch checklist',
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
	const taskId = this.getNodeParameter('taskId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

	if (typeof updateFields.labels === 'string') {
		updateFields.labels = csvToArray(updateFields.labels);
	}

	const body = cleanBody({ ...updateFields });
	return aurentiaApiRequest.call(this, 'PUT', `/api/aurentia/tasks/cards/${taskId}`, body);
}
