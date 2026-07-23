import type { IDataObject, ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';
import { aurentiaApiRequest } from '../transport';

export async function getColumns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const boardId = this.getCurrentNodeParameter('boardId', { extractValue: true }) as string;
	if (!boardId) return [];
	// C12: GET /api/aurentia/tasks/boards/{boardId} returns data with a `columns` array
	const board = await aurentiaApiRequest.call(
		this,
		'GET',
		`/api/aurentia/tasks/boards/${boardId}`,
	);
	const columns = (board.columns as IDataObject[]) ?? [];
	return columns.map((c) => ({ name: String(c.name), value: String(c.id) }));
}

export async function getTables(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const baseId = this.getCurrentNodeParameter('baseId', { extractValue: true }) as string;
	if (!baseId) return [];
	// C17: GET /api/aurentia/bases/{baseId} returns data: { base, tables: [...] }
	const res = await aurentiaApiRequest.call(this, 'GET', `/api/aurentia/bases/${baseId}`);
	const tables = (res.tables as IDataObject[]) ?? [];
	return tables.map((t) => ({ name: String(t.name), value: String(t.id) }));
}

export async function getTableFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const baseId = this.getCurrentNodeParameter('baseId', { extractValue: true }) as string;
	const tableId = this.getCurrentNodeParameter('tableId') as string;
	if (!baseId || !tableId) return [];
	const res = await aurentiaApiRequest.call(this, 'GET', `/api/aurentia/bases/${baseId}`);
	const tables = (res.tables as IDataObject[]) ?? [];
	const table = tables.find((t) => String(t.id) === tableId);
	const fields = (table?.fields as IDataObject[]) ?? [];
	return fields.map((f) => ({ name: String(f.name), value: String(f.id) }));
}

export async function getPipelineStages(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const projectId = this.getCurrentNodeParameter('projectId', { extractValue: true }) as string;
	if (!projectId) return [];
	// C9: GET /api/aurentia/crm/pipeline/stages returns data as a direct array of stages
	const stages = (await aurentiaApiRequest.call(
		this,
		'GET',
		'/api/aurentia/crm/pipeline/stages',
		{},
		{ projectId },
	)) as unknown as IDataObject[];
	return stages.map((s) => ({
		name: `${String(s.name)} (${String(s.pipeline_type)})`,
		value: String(s.id),
	}));
}
