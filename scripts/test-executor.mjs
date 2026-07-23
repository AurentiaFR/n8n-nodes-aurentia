/**
 * Unit tests for the generic executor of the AUTO-GENERATED resources.
 *
 * Pure Node (node:assert, no test framework) — runs the COMPILED executor from
 * `dist/` against a fake IExecuteFunctions context whose transport is stubbed,
 * so it exercises the real path/query/body assembly end-to-end (incl. the
 * shared transport's envelope unwrap and X-Aurentia-Integration header).
 *
 * Scenarios are DISCOVERED from the generated catalog by shape (not hard-coded
 * operation values), so the test survives every regeneration.
 *
 * Run: npm run build && node scripts/test-executor.mjs
 */
import assert from 'node:assert/strict';
import { executeGenerated } from '../dist/nodes/Aurentia/actions/generated/executor.js';
import { GENERATED_RESOURCES } from '../dist/nodes/Aurentia/actions/generated/index.js';

let passed = 0;
function ok(label) {
	passed++;
	console.log(`  ✓ ${label}`);
}

/** Build a fake IExecuteFunctions that records the outgoing request. */
function makeCtx(params, { additionalFields = {} } = {}) {
	const captured = {};
	const ctx = {
		// Presence of getInputData makes the transport treat this as an execute
		// context (item-indexed getNodeParameter).
		getInputData: () => [{ json: {} }],
		getNode: () => ({ name: 'Aurentia', type: 'n8n-nodes-aurentia.aurentia' }),
		getNodeParameter(name, _i, fallback) {
			if (name === 'authentication') return 'apiKey';
			if (name === 'additionalFields') return additionalFields;
			if (name in params) return params[name];
			return fallback;
		},
		async getCredentials() {
			return { baseUrl: 'https://app.aurentia.fr', apiKey: 'aur_test' };
		},
		helpers: {
			httpRequestWithAuthentication: {
				async call(_self, credType, options) {
					captured.credType = credType;
					captured.options = options;
					return { success: true, data: { ok: true } };
				},
			},
		},
	};
	return { ctx, captured };
}

/** Find the first operation across all resources matching a predicate. */
function findOp(predicate) {
	for (const res of GENERATED_RESOURCES) {
		for (const op of res.operations) {
			if (predicate(op, res)) return { res, op };
		}
	}
	return null;
}

function pathParamNames(op) {
	return [...op.routeSpec.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
}
function topLevelProps(op) {
	return op.properties.filter((p) => p.name !== 'additionalFields');
}

// ---------------------------------------------------------------------------
console.log('test-executor:');

// Scenario 1 — GET with a RENAMED required query param (inputKey:queryKey),
// e.g. `project_id:projectId`. Must land in qs under the QUERY key, not the
// input key, and must NOT produce a body.
{
	const found = findOp(
		(op) =>
			op.routeSpec.method === 'GET' &&
			op.routeSpec.queryParams.some((q) => q.includes(':')) &&
			pathParamNames(op).length === 0,
	);
	assert.ok(found, 'expected a GET op with a renamed query param');
	const { op } = found;
	const renamed = op.routeSpec.queryParams.find((q) => q.includes(':'));
	const [inputKey, queryKey] = renamed.split(':');
	const { ctx, captured } = makeCtx({ [inputKey]: 'p1' });
	const out = await executeGenerated.call(ctx, found.res.resource, op.value, 0);
	assert.equal(captured.options.method, 'GET');
	assert.equal(captured.options.url, `https://app.aurentia.fr${op.routeSpec.path}`);
	assert.equal(captured.options.qs[queryKey], 'p1', `qs must use query key "${queryKey}"`);
	assert.equal(captured.options.qs[inputKey], undefined, 'input key must not leak into qs');
	assert.equal(captured.options.body, undefined, 'GET must not carry a body');
	assert.equal(captured.options.headers['X-Aurentia-Integration'], 'n8n');
	assert.deepEqual(out, { ok: true }, 'envelope must be unwrapped to data');
	ok(`GET renamed query param → qs["${queryKey}"] (${found.res.resource}.${op.value})`);
}

// Scenario 2 — GET whose optional filters live in an "Additional Fields"
// collection → merged into qs, empties omitted.
{
	const found = findOp(
		(op) =>
			op.routeSpec.method === 'GET' &&
			op.properties.some((p) => p.name === 'additionalFields') &&
			pathParamNames(op).length === 0,
	);
	assert.ok(found, 'expected a GET op with additionalFields');
	const { op } = found;
	const coll = op.properties.find((p) => p.name === 'additionalFields');
	const optNames = (coll.options ?? []).map((o) => o.name);
	assert.ok(optNames.length >= 1, 'collection should have options');
	const filled = optNames[0];
	const { ctx, captured } = makeCtx(
		{},
		{ additionalFields: { [filled]: 'v', __empty: '' } },
	);
	await executeGenerated.call(ctx, found.res.resource, op.value, 0);
	assert.equal(captured.options.qs[filled], 'v', 'filled filter must reach qs');
	assert.equal(captured.options.qs.__empty, undefined, 'empty filter must be omitted');
	ok(`GET additionalFields → qs (${found.res.resource}.${op.value})`);
}

// Scenario 3 — write op (POST/PATCH/PUT) with a json-typed property → parsed;
// static routeSpec.body wins.
{
	const found = findOp(
		(op) =>
			op.routeSpec.method !== 'GET' &&
			op.routeSpec.method !== 'DELETE' &&
			topLevelProps(op).some((p) => p.type === 'json') &&
			pathParamNames(op).length === 0,
	);
	assert.ok(found, 'expected a write op with a json property');
	const { op } = found;
	const jsonProp = topLevelProps(op).find((p) => p.type === 'json');
	const otherProps = topLevelProps(op).filter(
		(p) => p.type !== 'json' && !op.routeSpec.queryParams.some((q) => q.split(':')[0] === p.name),
	);
	const params = { [jsonProp.name]: '{"a":1}' };
	for (const p of otherProps) params[p.name] = 'x';
	const { ctx, captured } = makeCtx(params);
	await executeGenerated.call(ctx, found.res.resource, op.value, 0);
	assert.ok(captured.options.body, 'write op must carry a body');
	assert.deepEqual(captured.options.body[jsonProp.name], { a: 1 }, 'json must be parsed to object');
	if (op.routeSpec.body) {
		for (const [k, v] of Object.entries(op.routeSpec.body)) {
			assert.deepEqual(captured.options.body[k], v, `static body field "${k}" must win`);
		}
	}
	ok(`write op json parse + static body (${found.res.resource}.${op.value})`);
}

// Scenario 4 — path param substitution + missing path param throws.
{
	const found = findOp((op) => pathParamNames(op).length >= 1);
	assert.ok(found, 'expected an op with a path param');
	const { op } = found;
	const pname = pathParamNames(op)[0];
	// Happy path: substitution + URL-encoding.
	{
		const params = {};
		for (const n of pathParamNames(op)) params[n] = 'a/b';
		for (const p of topLevelProps(op)) if (!(p.name in params)) params[p.name] = p.type === 'json' ? '{}' : 'x';
		const { ctx, captured } = makeCtx(params);
		await executeGenerated.call(ctx, found.res.resource, op.value, 0);
		assert.ok(
			captured.options.url.includes(encodeURIComponent('a/b')),
			'path param must be URL-encoded into the path',
		);
		assert.ok(!captured.options.url.includes(`{${pname}}`), 'no placeholder must remain');
	}
	// Missing required path param → NodeOperationError.
	{
		const { ctx } = makeCtx({});
		await assert.rejects(
			() => executeGenerated.call(ctx, found.res.resource, op.value, 0),
			/path parameter/i,
			'missing path param must throw',
		);
	}
	ok(`path param substitution + missing throws (${found.res.resource}.${op.value})`);
}

// Scenario 5 — invalid JSON in a json property → clean NodeOperationError.
{
	const found = findOp(
		(op) =>
			op.routeSpec.method !== 'GET' &&
			topLevelProps(op).some((p) => p.type === 'json') &&
			pathParamNames(op).length === 0,
	);
	assert.ok(found, 'expected a write op with a json property');
	const { op } = found;
	const jsonProp = topLevelProps(op).find((p) => p.type === 'json');
	const params = { [jsonProp.name]: '{not json' };
	for (const p of topLevelProps(op)) if (!(p.name in params)) params[p.name] = 'x';
	const { ctx } = makeCtx(params);
	await assert.rejects(
		() => executeGenerated.call(ctx, found.res.resource, op.value, 0),
		/not valid JSON/i,
		'invalid JSON must throw a clean error',
	);
	ok(`invalid JSON → clean error (${found.res.resource}.${op.value})`);
}

// Scenario 6 — unknown resource / operation throw.
{
	const { ctx } = makeCtx({});
	await assert.rejects(() => executeGenerated.call(ctx, '__nope__', 'x', 0), /Unknown generated resource/);
	const someRes = GENERATED_RESOURCES[0];
	await assert.rejects(
		() => executeGenerated.call(ctx, someRes.resource, '__nope__', 0),
		/not supported/,
	);
	ok('unknown resource/operation throw');
}

console.log(`\ntest-executor: OK — ${passed} scenarios passed.`);
