import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { simplifyToggle } from '../common.descriptions';
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

export const description: INodeProperties[] = [
	{
		displayName: 'Task ID',
		name: 'taskId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the task to retrieve',
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const taskId = this.getNodeParameter('taskId', i) as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const task = await aurentiaApiRequest.call(this, 'GET', `/api/aurentia/tasks/cards/${taskId}`);
	return simplify ? pickFields(task, SIMPLIFY_FIELDS) : task;
}
