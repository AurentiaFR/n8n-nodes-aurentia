import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { NodeOperationError, jsonParse } from 'n8n-workflow';
import { baseLocator } from '../common.descriptions';

/** Base + Table selectors shared by every Record operation. */
export const baseAndTable: INodeProperties[] = [
	baseLocator,
	{
		displayName: 'Table Name or ID',
		name: 'tableId',
		type: 'options',
		typeOptions: {
			loadOptionsMethod: 'getTables',
			loadOptionsDependsOn: ['baseId.value'],
		},
		required: true,
		default: '',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
];

/** Data Mode selector + the two input surfaces (mapped fields vs raw JSON). */
export const dataModeFields: INodeProperties[] = [
	{
		displayName: 'Data Mode',
		name: 'dataMode',
		type: 'options',
		options: [
			{
				name: 'Define Below',
				value: 'defineBelow',
				description: 'Set each field value one by one',
			},
			{
				name: 'JSON',
				value: 'json',
				description: 'Provide all cells as a single JSON object keyed by field ID',
			},
		],
		default: 'defineBelow',
	},
	{
		displayName: 'Fields',
		name: 'fieldValues',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true },
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: { dataMode: ['defineBelow'] } },
		options: [
			{
				displayName: 'Field',
				name: 'field',
				values: [
					{
						displayName: 'Field Name or ID',
						name: 'fieldId',
						type: 'options',
						typeOptions: {
							loadOptionsMethod: 'getTableFields',
							loadOptionsDependsOn: ['baseId.value', 'tableId'],
						},
						default: '',
						description:
							'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
	},
	{
		displayName: 'Cells (JSON)',
		name: 'cellsJson',
		type: 'json',
		default: '{}',
		displayOptions: { show: { dataMode: ['json'] } },
		description: 'An object keyed by field ID, e.g. { "fieldUuid": "value" }',
	},
];

/**
 * Build the `cells` object from either the mapped field list ("Define Below")
 * or the raw JSON input, based on the Data Mode selector.
 */
export function resolveCells(this: IExecuteFunctions, i: number): IDataObject {
	const dataMode = this.getNodeParameter('dataMode', i, 'defineBelow') as string;

	if (dataMode === 'json') {
		const raw = this.getNodeParameter('cellsJson', i, '{}');
		if (raw && typeof raw === 'object') {
			return raw as IDataObject;
		}
		try {
			return jsonParse<IDataObject>(String(raw));
		} catch {
			throw new NodeOperationError(
				this.getNode(),
				'The Cells (JSON) value is not valid JSON',
				{
					description: 'Provide an object keyed by field ID, e.g. { "fieldUuid": "value" }',
					itemIndex: i,
				},
			);
		}
	}

	const fieldValues = this.getNodeParameter('fieldValues', i, {}) as {
		field?: Array<{ fieldId: string; value: string }>;
	};
	const cells: IDataObject = {};
	for (const entry of fieldValues.field ?? []) {
		if (entry.fieldId) {
			cells[entry.fieldId] = entry.value;
		}
	}
	return cells;
}
