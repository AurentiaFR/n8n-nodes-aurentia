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
		displayOptions: { show: { resource: ['task'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new task',
				action: 'Create a task',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a task',
				action: 'Delete a task',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a task',
				action: 'Get a task',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of tasks',
				action: 'Get many tasks',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a task',
				action: 'Update a task',
			},
		],
		default: 'create',
	},
	...forOperation('task', 'create', create.description),
	...forOperation('task', 'delete', del.description),
	...forOperation('task', 'get', get.description),
	...forOperation('task', 'getAll', getAll.description),
	...forOperation('task', 'update', update.description),
];
