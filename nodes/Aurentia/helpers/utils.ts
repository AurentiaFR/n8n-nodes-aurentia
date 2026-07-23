import type { IDataObject } from 'n8n-workflow';

/**
 * Read a resourceLocator or plain-string parameter as an ID string:
 *   const projectId = this.getNodeParameter('projectId', i, undefined, { extractValue: true }) as string;
 */

/** Keep only the given keys of an object (simplify pattern). */
export function pickFields(item: IDataObject, fields: string[]): IDataObject {
	return Object.fromEntries(fields.map((f) => [f, item[f] ?? null]));
}

/** Split a comma-separated string into a trimmed, non-empty array. */
export function csvToArray(value: string | undefined): string[] {
	if (!value) return [];
	return value
		.split(',')
		.map((v) => v.trim())
		.filter((v) => v.length > 0);
}

/** Drop undefined/empty-string keys before sending a body. */
export function cleanBody(body: IDataObject): IDataObject {
	return Object.fromEntries(
		Object.entries(body).filter(([, v]) => v !== undefined && v !== ''),
	);
}

/**
 * Re-key a record's `cells` object from field UUID to field name (simplify for
 * Bases records). `fields` is the table schema array of `{ id, name }`.
 */
export function rekeyCellsByFieldName(
	records: IDataObject[],
	fields: IDataObject[],
): IDataObject[] {
	const nameById = new Map(fields.map((f) => [String(f.id), String(f.name)]));
	return records.map((r) => ({
		id: r.id,
		...Object.fromEntries(
			Object.entries((r.cells as IDataObject) ?? {}).map(([k, v]) => [
				nameById.get(k) ?? k,
				v,
			]),
		),
		created_at: r.created_at,
		updated_at: r.updated_at,
	}));
}
