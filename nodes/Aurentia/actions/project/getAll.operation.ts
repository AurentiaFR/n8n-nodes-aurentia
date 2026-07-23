import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { simplifyToggle } from '../common.descriptions';
import { pickFields } from '../../helpers/utils';

// C1 returns the dashboard project list shape (camelCase, bounded, no pagination).
const SIMPLIFY_FIELDS = [
	'id',
	'name',
	'description',
	'status',
	'projectType',
	'sector',
	'role',
	'isShared',
	'createdAt',
	'updatedAt',
];

export const description: INodeProperties[] = [simplifyToggle];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject[]> {
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	// C1: GET /api/aurentia/dashboard/projects returns data: { projects: [...] }
	const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/dashboard/projects');
	const projects = (res.projects as IDataObject[]) ?? [];
	return simplify ? projects.map((p) => pickFields(p, SIMPLIFY_FIELDS)) : projects;
}
