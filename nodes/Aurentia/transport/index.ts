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
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

type AurentiaContext = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions | IHookFunctions;

/**
 * Resolve which credential this node instance uses, based on the
 * `authentication` selector. Works across execute/loadOptions/poll contexts:
 * IExecuteFunctions expects an item index, while ILoadOptions/IPoll do not.
 * Any resolution issue falls back to the API key credential.
 */
function resolveCredentialType(context: AurentiaContext): 'aurentiaApi' | 'aurentiaOAuth2Api' {
	let authentication = 'apiKey';
	try {
		// IExecuteFunctions requires an item index; the other contexts reject one.
		if ('getInputData' in context) {
			authentication = context.getNodeParameter('authentication', 0, 'apiKey') as string;
		} else {
			authentication = (context as ILoadOptionsFunctions | IPollFunctions).getNodeParameter(
				'authentication',
				'apiKey',
			) as string;
		}
	} catch {
		authentication = 'apiKey';
	}
	return authentication === 'oAuth2' ? 'aurentiaOAuth2Api' : 'aurentiaApi';
}

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
	const credentialType = resolveCredentialType(this);
	const credentials = await this.getCredentials(credentialType);
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
			credentialType,
			options,
		)) as IDataObject;
		// Envelope: { success: true, data: <T> }
		return (response.data as IDataObject) ?? response;
	} catch (error) {
		throw mapAurentiaError(this, error as JsonObject);
	}
}

function mapAurentiaError(context: AurentiaContext, error: JsonObject): NodeApiError {
	const apiError = new NodeApiError(context.getNode(), error);
	const httpCode = String((error as IDataObject).httpCode ?? apiError.httpCode ?? '');
	const overrides: Record<string, { message: string; description: string }> = {
		'401': {
			message: 'Authentication did not succeed',
			description:
				'Reconnect your Aurentia OAuth2 credential, or check your API key under Settings > Integrations in Aurentia.',
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
			description: 'Check the ID — the item may have been deleted or belongs to another project.',
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
	// n8n returns an existing NodeApiError unchanged when wrapped a second time.
	if (override) {
		apiError.message = override.message;
		apiError.description = override.description;
	}
	return apiError;
}

/** Read every page, failing explicitly if the server returns an incomplete list. */
async function requestList(
	context: AurentiaContext,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
	kind: 'page' | 'offset',
): Promise<IDataObject[]> {
	if (!returnAll && (!Number.isInteger(limit) || limit < 1)) {
		throw new NodeOperationError(context.getNode(), 'Limit must be a positive whole number');
	}
	const pageSize = Math.min(returnAll ? Infinity : limit, kind === 'page' ? 100 : 500);
	const all: IDataObject[] = [];
	const pages = new Set<string>();
	for (let page = 1; page <= 10000; page++) {
		const offset = (page - 1) * pageSize;
		const res = await aurentiaApiRequest.call(
			context,
			'GET',
			endpoint,
			{},
			{
				...qs,
				...(kind === 'page' ? { page } : { offset }),
				limit: pageSize,
			},
		);
		const items = res?.[kind === 'page' ? 'data' : 'records'];
		const total = res?.total;
		if (
			!Array.isArray(items) ||
			items.some((item) => !item || typeof item !== 'object' || Array.isArray(item)) ||
			(total !== undefined &&
				(typeof total !== 'number' || !Number.isSafeInteger(total) || total < 0))
		) {
			throw new NodeOperationError(context.getNode(), 'Aurentia returned an invalid list', {
				description:
					'The list could not be read completely. Retry the operation; no polling progress has been saved.',
			});
		}
		if (items.length === 0) {
			if (typeof total === 'number' && offset < total) {
				throw new NodeOperationError(context.getNode(), 'Aurentia returned an incomplete list', {
					description:
						'A page is missing. Retry the operation; no polling progress has been saved.',
				});
			}
			return all;
		}
		const signature = JSON.stringify(items.map((item) => item.id ?? item));
		if (pages.has(signature)) {
			throw new NodeOperationError(context.getNode(), 'Aurentia repeated a page of results', {
				description:
					'Pagination stopped to avoid an endless loop. Retry the operation; no polling progress has been saved.',
			});
		}
		pages.add(signature);
		all.push(...(items as IDataObject[]));
		if (!returnAll && all.length >= limit) return all.slice(0, limit);
		if (typeof total === 'number' && offset + items.length >= total) return all;
		if (typeof total === 'number' && items.length < pageSize) {
			throw new NodeOperationError(context.getNode(), 'Aurentia returned an incomplete list', {
				description:
					'A page contains fewer items than expected. Retry the operation; no polling progress has been saved.',
			});
		}
	}
	throw new NodeOperationError(
		context.getNode(),
		'The Aurentia list is too large for one execution',
		{
			description:
				'Choose a smaller project or table. The 10,000-page limit was reached; no polling progress has been saved.',
		},
	);
}

/** Paginate page/limit endpoints (contacts, deals, posts). */
export async function aurentiaApiRequestPaged(
	this: AurentiaContext,
	endpoint: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	return requestList(this, endpoint, qs, returnAll, limit, 'page');
}

/** Paginate offset/limit records endpoints (bases). */
export async function aurentiaRecordsRequestPaged(
	this: AurentiaContext,
	tableId: string,
	qs: IDataObject,
	returnAll: boolean,
	limit: number,
): Promise<IDataObject[]> {
	return requestList(
		this,
		`/api/aurentia/bases/tables/${encodeURIComponent(tableId)}/records`,
		qs,
		returnAll,
		limit,
		'offset',
	);
}
