import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Contact ID',
		name: 'contactId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the contact to delete',
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const contactId = this.getNodeParameter('contactId', i) as string;
	await aurentiaApiRequest.call(this, 'DELETE', `/api/aurentia/crm/contacts/${contactId}`);
	return { deleted: true };
}
