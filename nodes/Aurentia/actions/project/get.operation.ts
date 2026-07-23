import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { projectLocator, simplifyToggle } from '../common.descriptions';
import { pickFields } from '../../helpers/utils';

const SIMPLIFY_FIELDS = [
	'id',
	'name',
	'description',
	'status',
	'project_type',
	'sector',
	'created_at',
	'updated_at',
];

export const description: INodeProperties[] = [projectLocator, simplifyToggle];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const project = await aurentiaApiRequest.call(
		this,
		'GET',
		`/api/aurentia/projects/${projectId}`,
	);
	return simplify ? pickFields(project, SIMPLIFY_FIELDS) : project;
}
