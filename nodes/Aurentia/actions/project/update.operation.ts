import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { projectLocator } from '../common.descriptions';
import { cleanBody } from '../../helpers/utils';

export const description: INodeProperties[] = [
	projectLocator,
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'Business Model',
				name: 'business_model',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Description',
				name: 'description',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Distinct Elements',
				name: 'distinct_elements',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Entrepreneur Motivations',
				name: 'entrepreneur_motivations',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Founding Team',
				name: 'founding_team',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{ displayName: 'Location', name: 'location', type: 'string', default: '' },
			{
				displayName: 'Primary Market',
				name: 'primary_market',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Problem',
				name: 'problem',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Product Service',
				name: 'product_service',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{ displayName: 'Project Type', name: 'project_type', type: 'string', default: '' },
			{
				displayName: 'Target Customers',
				name: 'target_customers',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Value Proposition',
				name: 'value_proposition',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
			{
				displayName: 'Vision',
				name: 'vision',
				type: 'string',
				typeOptions: { rows: 3 },
				default: '',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
	const body = cleanBody({ ...updateFields });
	return aurentiaApiRequest.call(this, 'PATCH', `/api/aurentia/projects/${projectId}`, body);
}
