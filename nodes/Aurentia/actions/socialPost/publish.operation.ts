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
		description: 'The ID of the post to publish',
	},
	{
		displayName: 'Publishes immediately on all platforms configured on the post.',
		name: 'publishNotice',
		type: 'notice',
		default: '',
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const postId = this.getNodeParameter('postId', i) as string;
	return aurentiaApiRequest.call(
		this,
		'POST',
		`/api/aurentia/social-media/posts/${postId}/publish-now`,
	);
}
