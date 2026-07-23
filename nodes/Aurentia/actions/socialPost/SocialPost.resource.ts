import type { INodeProperties } from 'n8n-workflow';
import { forOperation } from '../common.descriptions';

import * as create from './create.operation';
import * as del from './delete.operation';
import * as get from './get.operation';
import * as getAll from './getAll.operation';
import * as publish from './publish.operation';
import * as schedule from './schedule.operation';
import * as update from './update.operation';

export const operations = {
	create: create.execute,
	delete: del.execute,
	get: get.execute,
	getAll: getAll.execute,
	publish: publish.execute,
	schedule: schedule.execute,
	update: update.execute,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['socialPost'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new social post',
				action: 'Create a social post',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a social post',
				action: 'Delete a social post',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Retrieve a social post',
				action: 'Get a social post',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				description: 'Retrieve a list of social posts',
				action: 'Get many social posts',
			},
			{
				name: 'Publish',
				value: 'publish',
				description: 'Publish a social post immediately',
				action: 'Publish a social post',
			},
			{
				name: 'Schedule',
				value: 'schedule',
				description: 'Schedule a social post for later',
				action: 'Schedule a social post',
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update a social post',
				action: 'Update a social post',
			},
		],
		default: 'create',
	},
	...forOperation('socialPost', 'create', create.description),
	...forOperation('socialPost', 'delete', del.description),
	...forOperation('socialPost', 'get', get.description),
	...forOperation('socialPost', 'getAll', getAll.description),
	...forOperation('socialPost', 'publish', publish.description),
	...forOperation('socialPost', 'schedule', schedule.description),
	...forOperation('socialPost', 'update', update.description),
];
