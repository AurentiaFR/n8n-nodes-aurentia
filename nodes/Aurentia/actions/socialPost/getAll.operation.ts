import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequestPaged } from '../../transport';
import { projectLocator, returnAllAndLimit, simplifyToggle } from '../common.descriptions';
import { PLATFORM_OPTIONS, STATUS_OPTIONS } from './shared';
import { simplifyPost } from './simplify';

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
				displayName: 'Date From',
				name: 'dateFrom',
				type: 'dateTime',
				default: '',
				description: 'Only return posts scheduled on or after this date',
			},
			{
				displayName: 'Date To',
				name: 'dateTo',
				type: 'dateTime',
				default: '',
				description: 'Only return posts scheduled on or before this date',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
			},
			{
				displayName: 'Status',
				name: 'status',
				type: 'multiOptions',
				options: STATUS_OPTIONS,
				default: [],
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
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;

	const qs: IDataObject = { projectId };
	if (filters.dateFrom) qs.dateFrom = filters.dateFrom;
	if (filters.dateTo) qs.dateTo = filters.dateTo;
	if (Array.isArray(filters.status) && filters.status.length > 0) {
		qs.status = (filters.status as string[]).join(',');
	}
	if (Array.isArray(filters.platforms) && filters.platforms.length > 0) {
		qs.platforms = (filters.platforms as string[]).join(',');
	}

	const posts = await aurentiaApiRequestPaged.call(
		this,
		'/api/aurentia/social-media/posts',
		qs,
		returnAll,
		limit,
	);
	return simplify ? posts.map((p) => simplifyPost(p)) : posts;
}
