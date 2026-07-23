import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { aurentiaApiRequest } from '../../transport';
import { projectLocator } from '../common.descriptions';
import { cleanBody, csvToArray } from '../../helpers/utils';
import { FORMAT_OPTIONS, FUNNEL_STAGE_OPTIONS, PLATFORM_OPTIONS } from './shared';

export const description: INodeProperties[] = [
	projectLocator,
	{
		displayName: 'Text',
		name: 'text',
		type: 'string',
		typeOptions: { rows: 5 },
		required: true,
		default: '',
		placeholder: 'e.g. We just shipped a big update — here is what changed.',
		description: 'The main text of the post',
	},
	{
		displayName: 'Platforms',
		name: 'platforms',
		type: 'multiOptions',
		required: true,
		default: [],
		options: PLATFORM_OPTIONS,
		description: 'The platforms this post will be published to',
	},
	{
		displayName: 'To schedule or publish the post, chain a Schedule or Publish operation after this one.',
		name: 'scheduleNotice',
		type: 'notice',
		default: '',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
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
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'e.g. q1, campaign',
				description: 'Comma-separated list of internal tags',
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
	const projectId = this.getNodeParameter('projectId', i, undefined, {
		extractValue: true,
	}) as string;
	const text = this.getNodeParameter('text', i) as string;
	const platforms = this.getNodeParameter('platforms', i, []) as string[];
	const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

	const content = cleanBody({
		text,
		hashtags: csvToArray(additionalFields.hashtags as string | undefined),
		link: additionalFields.link,
		first_comment: additionalFields.first_comment,
	});

	const body = cleanBody({
		projectId,
		platforms,
		content,
		title: additionalFields.title,
		format: additionalFields.format,
		funnel_stage: additionalFields.funnel_stage,
		tags: csvToArray(additionalFields.tags as string | undefined),
	});

	// C22: never send scheduled_at on create — scheduling is a separate operation.
	return aurentiaApiRequest.call(this, 'POST', '/api/aurentia/social-media/posts', body);
}
