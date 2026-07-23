import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { simplifyToggle } from '../common.descriptions';
import { pickFields } from '../../helpers/utils';

const SIMPLIFY_FIELDS = [
	'id',
	'first_name',
	'last_name',
	'company',
	'email',
	'phone',
	'contact_type',
	'current_stage_id',
	'ai_score',
	'created_at',
];

export const description: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the contact to retrieve',
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const contactId = this.getNodeParameter('contactId', i) as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const contact = await aurentiaApiRequest.call(
		this,
		'GET',
		`/api/aurentia/crm/contacts/${contactId}`,
	);
	return simplify ? pickFields(contact, SIMPLIFY_FIELDS) : contact;
}
