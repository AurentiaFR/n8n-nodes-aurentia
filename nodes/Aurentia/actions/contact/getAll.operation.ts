import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequestPaged } from '../../transport';
import { projectLocator, returnAllAndLimit, simplifyToggle } from '../common.descriptions';
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
				displayName: 'Contact Type',
				name: 'type',
				type: 'string',
				default: '',
				description: 'Pipeline slug, e.g. client, partenaire, fournisseur',
			},
			{ displayName: 'Industry', name: 'industry', type: 'string', default: '' },
			{
				displayName: 'Search',
				name: 'search',
				type: 'string',
				default: '',
				description: 'Search in names, emails, phones and company',
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
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		options: [
			{
				displayName: 'Sort By',
				name: 'sortBy',
				type: 'options',
				options: [
					{ name: 'Company', value: 'company' },
					{ name: 'Created At', value: 'created_at' },
					{ name: 'Name', value: 'name' },
					{ name: 'Updated At', value: 'updated_at' },
				],
				default: 'created_at',
			},
			{
				displayName: 'Sort Order',
				name: 'sortOrder',
				type: 'options',
				options: [
					{ name: 'Ascending', value: 'asc' },
					{ name: 'Descending', value: 'desc' },
				],
				default: 'desc',
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
	const options = this.getNodeParameter('options', i, {}) as IDataObject;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const qs: IDataObject = { projectId, ...filters, ...options };
	const contacts = await aurentiaApiRequestPaged.call(
		this,
		'/api/aurentia/crm/contacts',
		qs,
		returnAll,
		limit,
	);
	return simplify ? contacts.map((c) => pickFields(c, SIMPLIFY_FIELDS)) : contacts;
}
