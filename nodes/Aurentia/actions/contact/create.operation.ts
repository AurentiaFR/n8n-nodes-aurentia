import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { projectLocator } from '../common.descriptions';
import { cleanBody } from '../../helpers/utils';

export const description: INodeProperties[] = [
	projectLocator,
	{
		displayName: 'First Name',
		name: 'firstName',
		type: 'string',
		default: '',
		placeholder: 'e.g. Marie',
		description: 'At least one of First Name, Last Name, or Company is required',
	},
	{
		displayName: 'Last Name',
		name: 'lastName',
		type: 'string',
		default: '',
		placeholder: 'e.g. Dupont',
	},
	{
		displayName: 'Company',
		name: 'company',
		type: 'string',
		default: '',
		placeholder: 'e.g. Acme SAS',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{
				displayName: 'Contact Type',
				name: 'contact_type',
				type: 'string',
				default: 'client',
				description: 'Pipeline slug as configured in your CRM, e.g. client, partenaire, fournisseur',
			},
			{
				displayName: 'Country',
				name: 'country',
				type: 'string',
				default: '',
				placeholder: 'e.g. FR',
				description: 'Two-letter country code',
			},
			{ displayName: 'Department', name: 'department', type: 'string', default: '' },
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				default: '',
				placeholder: 'e.g. marie@acme.fr',
			},
			{ displayName: 'Industry', name: 'industry', type: 'string', default: '' },
			{
				displayName: 'Phone',
				name: 'phone',
				type: 'string',
				default: '',
				placeholder: 'e.g. +33 6 12 34 56 78',
			},
			{ displayName: 'Postal Code', name: 'postal_code', type: 'string', default: '' },
			{
				displayName: 'Stage Name or ID',
				name: 'current_stage_id',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPipelineStages',
					loadOptionsDependsOn: ['projectId.value'],
				},
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
			{
				displayName: 'Website',
				name: 'website',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://acme.fr',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	const firstName = this.getNodeParameter('firstName', i, '') as string;
	const lastName = this.getNodeParameter('lastName', i, '') as string;
	const company = this.getNodeParameter('company', i, '') as string;
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

	if (!firstName && !lastName && !company) {
		throw new NodeOperationError(
			this.getNode(),
			'At least one of First Name, Last Name, or Company must be set',
			{ itemIndex: i },
		);
	}

	const body = cleanBody({
		project_id: projectId,
		first_name: firstName,
		last_name: lastName,
		company,
		...additionalFields,
	});

	return aurentiaApiRequest.call(this, 'POST', '/api/aurentia/crm/contacts', body);
}
