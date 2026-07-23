import type { INodeProperties } from 'n8n-workflow';
import { forOperation } from '../common.descriptions';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as update from './update.operation';

export const operations = {
	create: create.execute,
	delete: del.execute,
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
		displayOptions: { show: { resource: ['deal'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new deal',
				action: 'Create a deal',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a deal',
				action: 'Delete a deal',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a deal',
				action: 'Get a deal',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of deals',
				action: 'Get many deals',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a deal',
				action: 'Update a deal',
			},
		],
		default: 'create',
	},
	...forOperation('deal', 'create', create.description),
	...forOperation('deal', 'delete', del.description),
	...forOperation('deal', 'get', get.description),
	...forOperation('deal', 'getAll', getAll.description),
	...forOperation('deal', 'update', update.description),
];
