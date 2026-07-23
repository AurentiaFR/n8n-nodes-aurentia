import type { INodeProperties } from 'n8n-workflow';
import { forOperation } from '../common.descriptions';

import * as getProfile from './getProfile.operation';
import * as getCreditBalance from './getCreditBalance.operation';

export const operations = {
	getProfile: getProfile.execute,
	getCreditBalance: getCreditBalance.execute,
};

export const description: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['account'] } },
		options: [
			{
				name: 'Get Credit Balance',
				value: 'getCreditBalance',
				description: 'Retrieve the credit balance of your account',
				action: 'Get my credit balance',
			},
			{
				name: 'Get Profile',
				value: 'getProfile',
				description: 'Retrieve your account profile',
				action: 'Get my profile',
			},
		],
		default: 'getProfile',
	},
	...forOperation('account', 'getProfile', getProfile.description),
	...forOperation('account', 'getCreditBalance', getCreditBalance.description),
];
