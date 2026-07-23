import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { cleanBody, csvToArray } from '../../helpers/utils';
import { FORMAT_OPTIONS, FUNNEL_STAGE_OPTIONS, PLATFORM_OPTIONS } from './shared';

export const description: INodeProperties[] = [
	{
		displayName: 'Post ID',
		name: 'postId',
		type: 'string',
		required: true,
		default: '',
		placeholder: 'e.g. 1a2b3c4d-0000-0000-0000-000000000000',
		description: 'The ID of the post to update',
	},
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		options: [
			{
				displayName: 'First Comment',
				name: 'first_comment',
				type: 'string',
				typeOptions: { rows: 2 },
				default: '',
				description: 'A comment posted right after the post (max 1500 characters)',
			},
			{
				displayName: 'Format',
				name: 'format',
				type: 'options',
				options: FORMAT_OPTIONS,
				default: 'post',
			},
			{
				displayName: 'Funnel Stage',
				name: 'funnel_stage',
				type: 'options',
				options: FUNNEL_STAGE_OPTIONS,
				default: 'tofu',
			},
			{
				displayName: 'Hashtags',
				name: 'hashtags',
				type: 'string',
				default: '',
				placeholder: 'e.g. launch, product, saas',
				description: 'Comma-separated list of hashtags, without the # sign',
			},
			{
				displayName: 'Link',
				name: 'link',
				type: 'string',
				default: '',
				placeholder: 'e.g. https://aurentia.fr',
			},
			{
				displayName: 'Platforms',
				name: 'platforms',
				type: 'multiOptions',
				options: PLATFORM_OPTIONS,
				default: [],
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'e.g. q1, campaign',
				description: 'Comma-separated list of internal tags',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: { rows: 5 },
				default: '',
				description: 'The main text of the post',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'e.g. Product launch announcement',
				description: 'An internal title for the post (max 200 characters)',
			},
		],
	},
];

export async function execute(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const postId = this.getNodeParameter('postId', i) as string;
	const updateFields = this.getNodeParameter('updateFields', i, {}) as IDataObject;

	// Rebuild `content` only from the keys the user actually provided.
	const content: IDataObject = {};
	if (updateFields.text !== undefined) content.text = updateFields.text;
	if (updateFields.hashtags !== undefined) {
		content.hashtags = csvToArray(updateFields.hashtags as string);
	}
	if (updateFields.link !== undefined) content.link = updateFields.link;
	if (updateFields.first_comment !== undefined) {
		content.first_comment = updateFields.first_comment;
	}

	const body = cleanBody({
		title: updateFields.title,
		format: updateFields.format,
		funnel_stage: updateFields.funnel_stage,
		platforms:
			Array.isArray(updateFields.platforms) && updateFields.platforms.length > 0
				? updateFields.platforms
				: undefined,
		tags:
			updateFields.tags !== undefined
				? csvToArray(updateFields.tags as string)
				: undefined,
	});
	if (Object.keys(content).length > 0) {
		body.content = content;
	}

	return aurentiaApiRequest.call(this, 'PATCH', `/api/aurentia/social-media/posts/${postId}`, body);
}
