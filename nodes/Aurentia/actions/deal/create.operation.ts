import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { contactLocator, projectLocator } from '../common.descriptions';
import { cleanBody } from '../../helpers/utils';

export const description: INodeProperties[] = [
	projectLocator,
	contactLocator,
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. Website redesign',
		description: 'The title of the deal',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
			{ displayName: 'Value', name: 'value', type: 'number', default: 0 },
		],
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	const contactId = this.getNodeParameter('contactId', i, undefined, {
		extractValue: true,
	}) as string;
	const title = this.getNodeParameter('title', i) as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

	if (additionalFields.expected_close_date) {
		additionalFields.expected_close_date = String(additionalFields.expected_close_date).slice(
			0,
			10,
		);
	}

	const body = cleanBody({
		project_id: projectId,
		contact_id: contactId,
		title,
		...additionalFields,
	});

	return aurentiaApiRequest.call(this, 'POST', '/api/aurentia/crm/deals', body);
}
