import type { IDataObject, ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';
import { aurentiaApiRequest } from '../transport';

export async function searchProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// C1: GET /api/aurentia/dashboard/projects returns data: { projects: [...] }
	const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/dashboard/projects');
	const projects = (res.projects as IDataObject[]) ?? [];
	const query = (filter ?? '').toLowerCase();
	const results = projects
		.filter((p) => !query || String(p.name ?? '').toLowerCase().includes(query))
		.map((p) => ({ name: String(p.name ?? p.id), value: String(p.id) }));
	return { results };
}

export async function searchContacts(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const projectId = this.getCurrentNodeParameter('projectId', { extractValue: true }) as string;
	const qs: IDataObject = { projectId, limit: 100, sortBy: 'updated_at', sortOrder: 'desc' };
	if (filter) qs.search = filter;
	const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/crm/contacts', {}, qs);
	const contacts = (res.data as IDataObject[]) ?? [];
	const results = contacts.map((c) => ({
		name:
			[c.first_name, c.last_name].filter(Boolean).join(' ') ||
			String(c.company ?? c.id),
		value: String(c.id),
	}));
	return { results };
}

export async function searchBoards(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// C11: GET /api/aurentia/tasks/boards?all=true returns data as a direct array
	const boards = (await aurentiaApiRequest.call(
		this,
		'GET',
		'/api/aurentia/tasks/boards',
		{},
		{ all: 'true' },
	)) as unknown as IDataObject[];
	const query = (filter ?? '').toLowerCase();
	const results = boards
		.filter((b) => !query || String(b.name ?? '').toLowerCase().includes(query))
		.map((b) => ({ name: String(b.name ?? b.id), value: String(b.id) }));
	return { results };
}

export async function searchBases(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	// C16: GET /api/aurentia/bases returns data: { workspaces: [...], bases: [...] }
	const res = await aurentiaApiRequest.call(this, 'GET', '/api/aurentia/bases');
	const bases = (res.bases as IDataObject[]) ?? [];
	const query = (filter ?? '').toLowerCase();
	const results = bases
		.filter((b) => !query || String(b.name ?? '').toLowerCase().includes(query))
		.map((b) => ({ name: String(b.name ?? b.id), value: String(b.id) }));
	return { results };
}
