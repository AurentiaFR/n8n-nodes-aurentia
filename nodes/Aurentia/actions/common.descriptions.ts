import type { INodeProperties } from 'n8n-workflow';

export const projectLocator: INodeProperties = {
	displayName: 'Project',
	name: 'projectId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The Aurentia project to operate in',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'searchProjects', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9a-fA-F-]{36}$',
						errorMessage: 'Not a valid UUID',
					},
				},
			],
		},
	],
};

export const contactLocator: INodeProperties = {
	displayName: 'Contact',
	name: 'contactId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The contact this deal belongs to',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'searchContacts', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9a-fA-F-]{36}$',
						errorMessage: 'Not a valid UUID',
					},
				},
			],
		},
	],
};

export const boardLocator: INodeProperties = {
	displayName: 'Board',
	name: 'boardId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The task board to operate in',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'searchBoards', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9a-fA-F-]{36}$',
						errorMessage: 'Not a valid UUID',
					},
				},
			],
		},
	],
};

export const baseLocator: INodeProperties = {
	displayName: 'Base',
	name: 'baseId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The Aurentia database (Bases) to operate in',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			typeOptions: { searchListMethod: 'searchBases', searchable: true },
		},
		{
			displayName: 'By ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
			validation: [
				{
					type: 'regex',
					properties: {
						regex: '^[0-9a-fA-F-]{36}$',
						errorMessage: 'Not a valid UUID',
					},
				},
			],
		},
	],
};

export const returnAllAndLimit: INodeProperties[] = [
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		default: 50,
		typeOptions: { minValue: 1 },
		displayOptions: { show: { returnAll: [false] } },
		description: 'Max number of results to return',
	},
];

export const simplifyToggle: INodeProperties = {
	displayName: 'Simplify',
	name: 'simplify',
	type: 'boolean',
	default: true,
	description:
		'Whether to return a simplified version of the response instead of the raw data',
};

/** Helper: scope a list of properties to one resource+operation. */
export function forOperation(
	resource: string,
	operation: string,
	properties: INodeProperties[],
): INodeProperties[] {
	return properties.map((p) => ({
		...p,
		displayOptions: {
			...p.displayOptions,
			show: {
				resource: [resource],
				operation: [operation],
				...p.displayOptions?.show,
			},
		},
	}));
}
