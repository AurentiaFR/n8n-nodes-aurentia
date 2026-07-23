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
		description: 'The ID of the post to schedule',
	},
	{
		displayName: 'Scheduled At',
		name: 'scheduledAt',
		type: 'dateTime',
		required: true,
		default: '',
		description: 'When the post should be published',
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const postId = this.getNodeParameter('postId', i) as string;
	const scheduledAt = this.getNodeParameter('scheduledAt', i) as string;
	// C24: omitting `arm` programs the post (dispatches to Bundle.social).
	return aurentiaApiRequest.call(
		this,
		'POST',
		`/api/aurentia/social-media/posts/${postId}/schedule`,
		{ scheduled_at: scheduledAt },
	);
}
