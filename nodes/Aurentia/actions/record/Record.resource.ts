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
		displayOptions: { show: { resource: ['record'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new record',
				action: 'Create a record',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a record',
				action: 'Delete a record',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a record',
				action: 'Get a record',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of records',
				action: 'Get many records',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a record',
				action: 'Update a record',
			},
		],
		default: 'create',
	},
	...forOperation('record', 'create', create.description),
	...forOperation('record', 'delete', del.description),
	...forOperation('record', 'get', get.description),
	...forOperation('record', 'getAll', getAll.description),
	...forOperation('record', 'update', update.description),
];
