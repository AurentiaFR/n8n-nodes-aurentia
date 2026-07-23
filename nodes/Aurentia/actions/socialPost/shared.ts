import type { INodePropertyOptions } from 'n8n-workflow';

/**
 * The 16 social platforms supported by Aurentia (C21), Title Case labels.
 * `twitter` is shown as "X (Twitter)" to match the current product naming.
 */
export const PLATFORM_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Bluesky', value: 'bluesky' },
	{ name: 'Discord', value: 'discord' },
	{ name: 'Facebook', value: 'facebook' },
	{ name: 'Google Business', value: 'google_business' },
	{ name: 'Instagram', value: 'instagram' },
	{ name: 'LinkedIn', value: 'linkedin' },
	{ name: 'Mastodon', value: 'mastodon' },
	{ name: 'Pinterest', value: 'pinterest' },
	{ name: 'Reddit', value: 'reddit' },
	{ name: 'Slack', value: 'slack' },
	{ name: 'Snapchat', value: 'snapchat' },
	{ name: 'Telegram', value: 'telegram' },
	{ name: 'Threads', value: 'threads' },
	{ name: 'TikTok', value: 'tiktok' },
	{ name: 'X (Twitter)', value: 'twitter' },
	{ name: 'YouTube', value: 'youtube' },
];

/** The 8 post statuses (C21) used for the Get Many status filter. */
export const STATUS_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Draft', value: 'draft' },
	{ name: 'Pending Review', value: 'pending_review' },
	{ name: 'Approved', value: 'approved' },
	{ name: 'Scheduled', value: 'scheduled' },
	{ name: 'Publishing', value: 'publishing' },
	{ name: 'Published', value: 'published' },
	{ name: 'Failed', value: 'failed' },
	{ name: 'Library', value: 'library' },
];

export const FORMAT_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Post', value: 'post' },
	{ name: 'Carousel', value: 'carousel' },
	{ name: 'Story', value: 'story' },
	{ name: 'Reel', value: 'reel' },
	{ name: 'Article', value: 'article' },
];

export const FUNNEL_STAGE_OPTIONS: INodePropertyOptions[] = [
	{ name: 'Top of Funnel (TOFU)', value: 'tofu' },
	{ name: 'Middle of Funnel (MOFU)', value: 'mofu' },
	{ name: 'Bottom of Funnel (BOFU)', value: 'bofu' },
];
