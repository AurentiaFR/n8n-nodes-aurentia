import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { cleanBody } from '../../helpers/utils';

export const description: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the contact to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{ displayName: 'City', name: 'city', type: 'string', default: '' },
			{ displayName: 'Company', name: 'company', type: 'string', default: '' },
			{
				displayName: 'Contact Type',
				name: 'contact_type',
				type: 'string',
				default: '',
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
			{
				displayName: 'First Name',
				name: 'first_name',
				type: 'string',
				default: '',
				placeholder: 'e.g. Marie',
			},
			{ displayName: 'Industry', name: 'industry', type: 'string', default: '' },
			{
				displayName: 'Last Name',
				name: 'last_name',
				type: 'string',
				default: '',
				placeholder: 'e.g. Dupont',
			},
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
	const contactId = this.getNodeParameter('contactId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;
	const body = cleanBody({ ...updateFields });
	return aurentiaApiRequest.call(this, 'PUT', `/api/aurentia/crm/contacts/${contactId}`, body);
}
