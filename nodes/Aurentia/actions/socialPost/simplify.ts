import type { IDataObject } from 'n8n-workflow';

/**
 * Simplify a social post: keep the identifying fields, pull the text out of the
 * nested `content` object, and flatten `platforms` to a plain array of names.
 */
export function simplifyPost(post: IDataObject): IDataObject {
	const content = (post.content as IDataObject) ?? {};
	const rawPlatforms = (post.platforms as IDataObject[]) ?? [];
	const platforms = rawPlatforms.map((p) =>
		typeof p === 'string' ? p : String(p.platform ?? p.name ?? p.id ?? ''),
	);

	return {
		id: post.id,
		title: post.title ?? null,
		text: content.text ?? null,
		status: post.status ?? null,
		platforms,
		scheduled_at: post.scheduled_at ?? null,
		published_at: post.published_at ?? null,
		created_at: post.created_at ?? null,
	};
}
