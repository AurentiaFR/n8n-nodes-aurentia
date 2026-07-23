import type {
	IDataObject,
	IExecuteFunctions,
	IHookFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

type AurentiaContext =
	| IExecuteFunctions
	| ILoadOptionsFunctions
	| IPollFunctions
	| IHookFunctions;

/**
 * Perform an authenticated request against the Aurentia API and unwrap the
 * `{ success, data }` envelope. Throws a mapped NodeApiError on failure.
 */
export async function aurentiaApiRequest(
	this: AurentiaContext,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<IDataObject> {
	const credentials = await this.getCredentials('aurentiaApi');
	const baseUrl = (credentials.baseUrl as string).replace(/\/+$/, '');

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
			'X-Aurentia-Integration': 'n8n',
		},
		qs,
		json: true,
	};
	if (Object.keys(body).length !== 0) {
		options.body = body;
	}

	try {
		const response = (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'aurentiaApi',
			options,
		)) as IDataObject;
		// Envelope: { success: true, data: <T> }
		return (response.data as IDataObject) ?? response;
	} catch (error) {
		throw mapAurentiaError(this, error as JsonObject);
	}
}

function mapAurentiaError(context: AurentiaContext, error: JsonObject): NodeApiError {
	const httpCode = String((error as IDataObject).httpCode ?? '');
	const overrides: Record<string, { message: string; description: string }> = {
		'401': {
			message: 'Authentication did not succeed',
			description:
				'Check your Aurentia API key, or generate a new one under Settings > Integrations in Aurentia. Note that generating a new key revokes the old one.',
		},
		'402': {
			message: 'Not enough Aurentia credits',
			description: 'Top up your credits in Aurentia under Settings > Credits, then retry.',
		},
		'403': {
			message: 'Access to this resource is not allowed',
			description:
				'Your Aurentia account does not have permission for this action on this project.',
		},
		'404': {
			message: 'Resource not found in Aurentia',
			description:
				'Check the ID — the item may have been deleted or belongs to another project.',
		},
		'409': {
			message: 'The request conflicts with existing data',
			description: 'A similar item may already exist. Check the input values.',
		},
		'429': {
			message: 'Aurentia rate limit reached',
			description:
				'Too many requests in a short time. Add a Wait node or reduce the polling frequency.',
		},
	};
	const override = overrides[httpCode];
	return override
		? new NodeApiError(context.getNode(), error, override)
		: new NodeApiError(context.getNode(), error);
}

/** Paginate a page/limit endpoint (contacts, deals, posts) until `total` is reached. */
export async function aurentiaApiRequestPaged(
	this: AurentiaContext,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	const pageSize = returnAll ? 100 : Math.min(limit, 100);
	const all: IDataObject[] = [];
	let page = 1;
	for (;;) {
		const res = await aurentiaApiRequest.call(
			this,
			'GET',
			endpoint,
			{},
			{ ...qs, page, limit: pageSize },
		);
		const items = (res.data as IDataObject[]) ?? [];
		all.push(...items);
		const total = typeof res.total === 'number' ? res.total : all.length;
		if (!returnAll && all.length >= limit) return all.slice(0, limit);
		if (all.length >= total || items.length === 0) return all;
		page++;
	}
}

/** Paginate the offset/limit records endpoint (bases). */
export async function aurentiaRecordsRequestPaged(
	this: AurentiaContext,
	tableId: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	const pageSize = returnAll ? 500 : Math.min(limit, 500);
	const all: IDataObject[] = [];
	let offset = 0;
	for (;;) {
		const res = await aurentiaApiRequest.call(
			this,
			'GET',
			`/api/aurentia/bases/tables/${tableId}/records`,
			{},
			{ ...qs, offset, limit: pageSize },
		);
		const items = (res.data as IDataObject[]) ?? [];
		all.push(...items);
		const total = typeof res.total === 'number' ? res.total : all.length;
		if (!returnAll && all.length >= limit) return all.slice(0, limit);
		if (all.length >= total || items.length === 0) return all;
		offset += pageSize;
	}
}
