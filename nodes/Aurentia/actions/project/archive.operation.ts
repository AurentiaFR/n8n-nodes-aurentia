import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { projectLocator } from '../common.descriptions';

export const description: INodeProperties[] = [
	projectLocator,
	{
		displayName: 'The project is archived for 30 days and can be restored from Aurentia',
		name: 'archiveNotice',
		type: 'notice',
		default: '',
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	return aurentiaApiRequest.call(this, 'DELETE', `/api/aurentia/projects/${projectId}`);
}
