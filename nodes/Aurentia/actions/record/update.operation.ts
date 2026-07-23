import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { baseAndTable, dataModeFields, resolveCells } from './shared';

export const description: INodeProperties[] = [
	...baseAndTable,
	{
		displayName: 'Record ID',
		name: 'recordId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the record to update',
	},
	...dataModeFields,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const tableId = this.getNodeParameter('tableId', i) as string;
	const recordId = this.getNodeParameter('recordId', i) as string;
	const cells = resolveCells.call(this, i);
	// C20: PATCH takes { cells } (partial) plus table_id (needed for synced tables).
	return aurentiaApiRequest.call(this, 'PATCH', `/api/aurentia/bases/records/${recordId}`, {
		cells,
		table_id: tableId,
	});
}
