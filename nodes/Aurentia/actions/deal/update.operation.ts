import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { cleanBody } from '../../helpers/utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Deal ID',
		name: 'dealId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the deal to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Expected Close Date',
				name: 'expected_close_date',
				type: 'dateTime',
				default: '',
			},
			{
				displayName: 'Loss Reason',
				name: 'loss_reason',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Notes',
				name: 'notes',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Probability',
				name: 'probability_percent',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 100 },
				default: 50,
				description: 'Win probability, from 0 to 100',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stage_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPipelineStages',
					loadOptionsDependsOn: ['projectId.value'],
				},
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Website redesign',
			},
			{ displayName: 'Value', name: 'value', type: 'number', default: 0 },
		],
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const dealId = this.getNodeParameter('dealId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

	if (updateFields.expected_close_date) {
		updateFields.expected_close_date = String(updateFields.expected_close_date).slice(0, 10);
	}

	const body = cleanBody({ ...updateFields });
	return aurentiaApiRequest.call(this, 'PUT', `/api/aurentia/crm/deals/${dealId}`, body);
}
