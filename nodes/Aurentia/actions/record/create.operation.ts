import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { baseAndTable, dataModeFields, resolveCells } from './shared';

export const description: INodeProperties[] = [...baseAndTable, ...dataModeFields];

export async function execute(
	this: IExecuteFunctions,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const tableId = this.getNodeParameter('tableId', i) as string;
	const cells = resolveCells.call(this, i);
	// C19: POST /tables/{tableId}/records returns the created record(s) as an array.
	const created = (await aurentiaApiRequest.call(
		this,
		'POST',
		`/api/aurentia/bases/tables/${tableId}/records`,
		{ cells },
	)) as unknown as IDataObject | IDataObject[];
	return created;
}
