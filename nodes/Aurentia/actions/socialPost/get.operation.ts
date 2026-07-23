import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { simplifyToggle } from '../common.descriptions';
import { simplifyPost } from './simplify';

export const description: INodeProperties[] = [
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the post to retrieve',
	},
	simplifyToggle,
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const postId = this.getNodeParameter('postId', i) as string;
	const simplify = this.getNodeParameter('simplify', i, true) as boolean;
	const post = await aurentiaApiRequest.call(
		this,
		'GET',
		`/api/aurentia/social-media/posts/${postId}`,
	);
	return simplify ? simplifyPost(post) : post;
}
