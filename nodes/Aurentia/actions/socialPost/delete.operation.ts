import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';

export const description: INodeProperties[] = [
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the post to delete',
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const postId = this.getNodeParameter('postId', i) as string;
	await aurentiaApiRequest.call(this, 'DELETE', `/api/aurentia/social-media/posts/${postId}`);
	return { deleted: true };
}
