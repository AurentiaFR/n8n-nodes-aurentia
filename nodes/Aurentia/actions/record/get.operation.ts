import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the record to retrieve',
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const recordId = this.getNodeParameter('recordId', i) as string;
	// C20: raw record with `cells` keyed by field ID (no re-keying here — that is
	// offered on Get Many, where the base and table are already known).
	return aurentiaApiRequest.call(this, 'GET', `/api/aurentia/bases/records/${recordId}`);
}
