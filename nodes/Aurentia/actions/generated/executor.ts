/**
 * Generic executor for the AUTO-GENERATED resources.
 *
 * Hand-written (NOT generated): the generated operations are pure data
 * (routeSpec + INodeProperties). This one function reads the parameter values
 * for the selected operation, substitutes path params, applies query params,
 * assembles the body, and calls the shared transport — mirroring exactly the
 * runtime semantics of the MCP `executeTool()` in `lib/mcp/tool-definitions.ts`
 * so the n8n node and the MCP/agents/bots behave identically:
 *
 *   - Path params: `{key}` in `routeSpec.path` is replaced by the value of the
 *     property named `key` (URL-encoded before calling the transport).
 *   - Query params: `routeSpec.queryParams` entries are `inputKey:queryKey`
 *     (bare when identical). The property named `inputKey` is sent under the
 *     query-string name `queryKey`. Empty values are omitted.
 *   - Body (POST/PATCH/PUT/DELETE-with-body): every remaining property that is
 *     NOT a path param and NOT a query param, including the "Additional
 *     Fields" collection, plus the static `routeSpec.body` (static wins).
 *   - `json`-typed properties (arrays/objects) are parsed with `jsonParse`, with
 *     a clean NodeOperationError on invalid JSON, also inside collections.
 */
import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';

import { aurentiaApiRequest } from '../../transport';
import { GENERATED_RESOURCE_BY_VALUE, type GeneratedOperation } from './index';

/** Parse a `queryParams` entry into `[inputKey, queryKey]`. */
function splitQueryParam(entry: string): [string, string] {
	if (entry.includes(':')) {
		const [inputKey, queryKey] = entry.split(':');
		return [inputKey, queryKey];
	}
	return [entry, entry];
}

/** Read one property value, parsing `json`-typed fields into real objects. */
function readValue(
	ctx: IExecuteFunctions,
	i: number,
	prop: INodeProperties,
	raw: unknown,
): unknown {
	if (prop.type === 'json') {
		if (raw === undefined || raw === '') return undefined;
		if (raw === null) return null;
		if (typeof raw === 'object') return raw;
		try {
			return jsonParse(String(raw));
		} catch {
			throw new NodeOperationError(
				ctx.getNode(),
				`The value for "${prop.displayName}" is not valid JSON`,
				{
					description: 'Provide a valid JSON value, e.g. ["a","b"] or { "key": "value" }',
					itemIndex: i,
				},
			);
		}
	}
	return raw;
}

/** Whether a value should be omitted from the request (empty string / nullish). */
function isEmpty(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

/**
 * Execute a generated operation. Looked up by resource+operation from the
 * generated catalog; unknown pairs throw (the router only routes generated
 * resources here).
 */
export async function executeGenerated(
	this: IExecuteFunctions,
	resource: string,
	operation: string,
	i: number,
): Promise<IDataObject | IDataObject[]> {
	const generatedResource = GENERATED_RESOURCE_BY_VALUE[resource];
	if (!generatedResource) {
		throw new NodeOperationError(this.getNode(), `Unknown generated resource "${resource}"`);
	}
	const op: GeneratedOperation | undefined = generatedResource.operations.find(
		(o) => o.value === operation,
	);
	if (!op) {
		throw new NodeOperationError(
			this.getNode(),
			`The operation "${operation}" is not supported for resource "${resource}"`,
		);
	}

	const { routeSpec } = op;

	// Read each declared input once, wherever the generator placed it. Optional
	// inputs live inside a collection, including query parameters and JSON.
	const values: IDataObject = {};
	for (const prop of op.properties) {
		if (prop.name === 'additionalFields') {
			const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
			for (const field of (prop.options ?? []) as INodeProperties[]) {
				if (!Object.prototype.hasOwnProperty.call(additional, field.name)) continue;
				const value = readValue(this, i, field, additional[field.name]);
				if (value !== undefined) values[field.name] = value as IDataObject[string];
			}
		} else {
			const value = readValue(this, i, prop, this.getNodeParameter(prop.name, i, ''));
			if (!isEmpty(value)) values[prop.name] = value as IDataObject[string];
		}
	}

	const pathParamNames = new Set([...routeSpec.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
	const queryPairs = routeSpec.queryParams.map(splitQueryParam);
	const queryInputNames = new Set(queryPairs.map(([inputKey]) => inputKey));
	let path = routeSpec.path;
	for (const name of pathParamNames) {
		const value = values[name];
		if (isEmpty(value)) {
			throw new NodeOperationError(
				this.getNode(),
				`The required path parameter "${name}" is missing`,
				{ itemIndex: i },
			);
		}
		path = path.split(`{${name}}`).join(encodeURIComponent(String(value)));
	}

	const qs: IDataObject = {};
	for (const [inputKey, queryKey] of queryPairs) {
		// Match MCP's URLSearchParams semantics, including comma-separated arrays.
		if (!isEmpty(values[inputKey])) qs[queryKey] = String(values[inputKey]);
	}

	const body: IDataObject = {};
	for (const [key, value] of Object.entries(values)) {
		if (pathParamNames.has(key) || queryInputNames.has(key)) continue;
		if (routeSpec.method === 'GET') {
			if (!isEmpty(value)) qs[key] = String(value);
		} else {
			// An explicitly selected optional empty string/null clears a field.
			// Absent collection fields remain absent; false and zero are preserved.
			body[key] = value;
		}
	}
	if (routeSpec.method !== 'GET' && routeSpec.body) {
		Object.assign(body, routeSpec.body);
	}
	// Older API deployments require sender fields; newer ones derive them
	// server-side and ignore these keys. Use the authenticated profile in both
	// cases, without asking for identity again or retrying a message send.
	if (routeSpec.method === 'POST' && path === '/api/help/support-request') {
		const profile = await aurentiaApiRequest.call(this, 'GET', '/api/account/profile');
		if (typeof profile.email !== 'string' || !profile.email.trim()) {
			throw new NodeOperationError(this.getNode(), 'Your account email could not be read', {
				description: 'Check your Aurentia profile and reconnect the credential before retrying.',
				itemIndex: i,
			});
		}
		body.fromEmail = profile.email.trim();
		const name = [profile.firstName, profile.lastName]
			.filter((part): part is string => typeof part === 'string' && Boolean(part.trim()))
			.map((part) => part.trim())
			.join(' ');
		body.fromName = (name || body.fromEmail).slice(0, 100);
	}

	return aurentiaApiRequest.call(this, routeSpec.method, path, body, qs);
}
