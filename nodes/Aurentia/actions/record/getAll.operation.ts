import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest, aurentiaRecordsRequestPaged } from '../../transport';
import { returnAllAndLimit, simplifyToggle } from '../common.descriptions';
import { rekeyCellsByFieldName } from '../../helpers/utils';
import { baseAndTable } from './shared';

export const description: INodeProperties[] = [
	...baseAndTable,
	...returnAllAndLimit,
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search across cell values',
			},
		],
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const baseId = this.getNodeParameter('baseId', i, undefined, {
		extractValue: true,
	}) as string;
	const tableId = this.getNodeParameter('tableId', i) as string;
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const records = await aurentiaRecordsRequestPaged.call(
		this,
		tableId,
		{ ...filters },
		returnAll,
		limit,
	);

	if (!simplify) return records;

	// C17: one schema fetch per execution to re-key cells from field ID to name.
	const schema = await aurentiaApiRequest.call(this, 'GET', `/api/aurentia/bases/${baseId}`);
	const tables = (schema.tables as IDataObject[]) ?? [];
	const table = tables.find((t) => String(t.id) === tableId);
	const fields = (table?.fields as IDataObject[]) ?? [];
	return rekeyCellsByFieldName(records, fields);
}
