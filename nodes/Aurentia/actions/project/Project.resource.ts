import type { INodeProperties } from 'n8n-workflow';
import { forOperation } from '../common.descriptions';

import * as archive from './archive.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export const operations = {
	archive: archive.execute,
	get: get.execute,
	getAll: getAll.execute,
	update: update.execute,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['project'] } },
		options: [
			{
				name: 'Archive',
				value: 'archive',
				description: 'Archive a project — kept 30 days, restorable in Aurentia',
				action: 'Archive a project',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a project',
				action: 'Get a project',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of projects',
				action: 'Get many projects',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a project',
				action: 'Update a project',
			},
		],
		default: 'getAll',
	},
	...forOperation('project', 'archive', archive.description),
	...forOperation('project', 'get', get.description),
	...forOperation('project', 'getAll', getAll.description),
	...forOperation('project', 'update', update.description),
];
