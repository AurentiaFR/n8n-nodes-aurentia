/**
 * Generic executor for the AUTO-GENERATED resources.
 *
 * Hand-written (NOT generated): the ~766 generated operations are pure data
 * (routeSpec + INodeProperties). This one function reads the parameter values
 * for the selected operation, substitutes path params, applies query params,
 * assembles the body, and calls the shared transport — mirroring exactly the
 * runtime semantics of the MCP `executeTool()` in `lib/mcp/tool-definitions.ts`
 * so the n8n node and the MCP/agents/bots behave identically:
 *
 *   - Path params: `{key}` in `routeSpec.path` is replaced by the value of the
 *     property named `key` (URL-encoded by the URL builder in the transport).
 *   - Query params: `routeSpec.queryParams` entries are `inputKey:queryKey`
 *     (bare when identical). The property named `inputKey` is sent under the
 *     query-string name `queryKey`. Empty values are omitted.
 *   - Body (POST/PATCH/PUT/DELETE-with-body): every remaining property that is
 *     NOT a path param and NOT a query param, plus the merged "Additional
 *     Fields" collection, plus the static `routeSpec.body` (static wins).
 *   - `json`-typed properties (arrays/objects) are parsed with `jsonParse`, with
 *     a clean NodeOperationError on invalid JSON. Empty values are omitted.
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
): unknown {
	const raw = ctx.getNodeParameter(prop.name, i, undefined);
	if (prop.type === 'json') {
		if (raw === undefined || raw === null || raw === '') return undefined;
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

	// Classify the top-level properties by role. The "Additional Fields"
	// collection (optional props) is handled separately from `additionalFields`.
	const pathParamNames = new Set(
		[...routeSpec.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]),
	);
	const queryPairs = routeSpec.queryParams.map(splitQueryParam);
	const queryInputNames = new Set(queryPairs.map(([inputKey]) => inputKey));

	// Substitute path params.
	let path = routeSpec.path;
	const topLevelProps = op.properties.filter((p) => p.name !== 'additionalFields');
	for (const name of pathParamNames) {
		const value = this.getNodeParameter(name, i, '') as string;
		if (isEmpty(value)) {
			throw new NodeOperationError(
				this.getNode(),
				`The required path parameter "${name}" is missing`,
				{ itemIndex: i },
			);
		}
		path = path.replace(`{${name}}`, encodeURIComponent(String(value)));
	}

	// Build query string.
	const qs: IDataObject = {};
	for (const [inputKey, queryKey] of queryPairs) {
		const prop = topLevelProps.find((p) => p.name === inputKey);
		const value = prop ? readValue(this, i, prop) : this.getNodeParameter(inputKey, i, undefined);
		if (!isEmpty(value)) {
			qs[queryKey] = value as IDataObject[string];
		}
	}

	// Build body for write methods (everything not consumed as path/query).
	const body: IDataObject = {};
	if (routeSpec.method !== 'GET') {
		for (const prop of topLevelProps) {
			if (pathParamNames.has(prop.name) || queryInputNames.has(prop.name)) continue;
			const value = readValue(this, i, prop);
			if (!isEmpty(value)) body[prop.name] = value as IDataObject[string];
		}

		// Merge the "Additional Fields" collection (optional props), omitting
		// empty values. Collection values arrive already parsed by n8n.
		const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		for (const [key, value] of Object.entries(additional)) {
			if (!isEmpty(value)) body[key] = value;
		}

		// Static author-defined body fields win over caller input (they define
		// the semantic identity of the operation, e.g. { action: 'star' }).
		if (routeSpec.body) {
			for (const [key, value] of Object.entries(routeSpec.body)) {
				body[key] = value as IDataObject[string];
			}
		}
	} else {
		// GET can still carry optional filters via "Additional Fields" → query.
		const additional = this.getNodeParameter('additionalFields', i, {}) as IDataObject;
		for (const [key, value] of Object.entries(additional)) {
			if (!isEmpty(value)) qs[key] = value as IDataObject[string];
		}
	}

	return aurentiaApiRequest.call(this, routeSpec.method, path, body, qs);
}
