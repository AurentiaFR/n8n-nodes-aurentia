import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';

export const description: INodeProperties[] = [];

export async function execute(this: IExecuteFunctions): Promise<IDataObject> {
	return aurentiaApiRequest.call(this, 'GET', '/api/account/credits');
}
