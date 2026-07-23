import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequestPaged } from '../../transport';
import { projectLocator, returnAllAndLimit, simplifyToggle } from '../common.descriptions';
import { pickFields } from '../../helpers/utils';

const SIMPLIFY_FIELDS = [
	'id',
	'title',
	'value',
	'currency',
	'probability_percent',
	'stage_id',
	'contact_id',
	'expected_close_date',
	'created_at',
];

export const description: INodeProperties[] = [
	projectLocator,
	...returnAllAndLimit,
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		options: [
			{
				displayName: 'Contact ID',
				name: 'contactId',
				type: 'string',
				default: '',
				placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
				description: 'Only return deals attached to this contact',
			},
			{
				displayName: 'Stage Name or ID',
				name: 'stageId',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getPipelineStages',
					loadOptionsDependsOn: ['projectId.value'],
				},
				default: '',
				description: 'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
			},
		],
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	const returnAll = this.getNodeParameter('returnAll', i) as boolean;
	const limit = this.getNodeParameter('limit', i, 50) as number;
	const filters = this.getNodeParameter('filters', i, {}) as IDataObject;

	const qs: IDataObject = { projectId, ...filters };
	const deals = await aurentiaApiRequestPaged.call(
		this,
		'/api/aurentia/crm/deals',
		qs,
		returnAll,
		limit,
	);
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	return simplify ? deals.map((d) => pickFields(d, SIMPLIFY_FIELDS)) : deals;
}
