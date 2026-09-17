import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { executeGenerated } from '../dist/nodes/Aurentia/actions/generated/executor.js';
import { GENERATED_RESOURCES } from '../dist/nodes/Aurentia/actions/generated/index.js';
import { AurentiaTrigger } from '../dist/nodes/AurentiaTrigger/AurentiaTrigger.node.js';
import {
	aurentiaApiRequest,
	aurentiaApiRequestPaged,
} from '../dist/nodes/Aurentia/transport/index.js';
import { executionContext, pollingContext } from './test-context.mjs';
const { NodeApiError } = createRequire(import.meta.url)('n8n-workflow');

test('optional filters use the API alias (artifacts project scope)', async () => {
	const { context, requests } = executionContext({
		authentication: 'apiKey',
		additionalFields: { project_id: 'project-A' },
	});
	await executeGenerated.call(context, 'artifacts', 'listArtifacts', 0);
	assert.deepEqual(requests[0].qs, { projectId: 'project-A' });
});

test('every optional query parameter uses its declared destination, including write operations', async () => {
	let checked = 0;
	for (const resource of GENERATED_RESOURCES)
		for (const op of resource.operations) {
			const optional = op.properties.find((p) => p.name === 'additionalFields')?.options ?? [];
			for (const mapping of op.routeSpec.queryParams) {
				const [input, output = input] = mapping.split(':');
				const field = optional.find((p) => p.name === input);
				if (!field) continue;
				const expected =
					field.type === 'json'
						? ['value']
						: field.type === 'boolean'
							? false
							: field.type === 'number'
								? 0
								: 'value';
				const params = {
					authentication: 'apiKey',
					additionalFields: {
						[input]: field.type === 'json' ? JSON.stringify(expected) : expected,
					},
				};
				for (const p of op.properties.filter((p) => p.name !== 'additionalFields'))
					params[p.name] = p.type === 'json' ? '{}' : 'id';
				const { context, requests } = executionContext(params);
				await executeGenerated.call(context, resource.resource, op.value, 0);
				assert.equal(
					requests[0].qs[output],
					String(expected),
					`${resource.resource}.${op.value}.${input}`,
				);
				assert.equal(requests[0].body?.[input], undefined, 'query must not leak into body');
				if (input !== output) assert.equal(requests[0].qs[input], undefined);
				checked++;
			}
		}
	assert.ok(checked > 50);
});

test('optional JSON is parsed, invalid JSON fails before HTTP, explicit clearing values survive', async () => {
	const resource = GENERATED_RESOURCES.find((r) =>
		r.operations.some(
			(op) =>
				op.routeSpec.method === 'PATCH' &&
				op.properties
					.find((p) => p.name === 'additionalFields')
					?.options?.some((p) => p.type === 'json'),
		),
	);
	const op = resource.operations.find(
		(op) =>
			op.routeSpec.method === 'PATCH' &&
			op.properties
				.find((p) => p.name === 'additionalFields')
				?.options?.some((p) => p.type === 'json'),
	);
	const field = op.properties
		.find((p) => p.name === 'additionalFields')
		.options.find((p) => p.type === 'json').name;
	const params = Object.fromEntries(
		op.properties.filter((p) => p.name !== 'additionalFields').map((p) => [p.name, 'id']),
	);
	for (const [raw, expected] of [
		['["a","b"]', ['a', 'b']],
		[null, null],
		['null', null],
		['[]', []],
	]) {
		const { context, requests } = executionContext({
			...params,
			additionalFields: { [field]: raw },
		});
		await executeGenerated.call(context, resource.resource, op.value, 0);
		assert.deepEqual(requests[0].body[field], expected);
	}
	const { context, requests } = executionContext({
		...params,
		additionalFields: { [field]: '{broken' },
	});
	await assert.rejects(
		() => executeGenerated.call(context, resource.resource, op.value, 0),
		/JSON/,
	);
	assert.equal(requests.length, 0);
});

const trigger = new AurentiaTrigger();
test('support derives sender identity before sending to either API version', async () => {
	const { context, requests } = executionContext(
		{ product: 'aurentia', subject: 'Help', message: 'Please help' },
		async ({ method }) => ({
			success: true,
			data:
				method === 'GET'
					? { email: 'marie@example.test', firstName: ' Marie ', lastName: ' Dupont ' }
					: { sent: true },
		}),
	);
	await executeGenerated.call(context, 'help', 'sendSupportRequest', 0);
	assert.equal(requests.length, 2);
	assert.match(requests[0].url, /\/api\/account\/profile$/);
	assert.equal(requests[1].body.fromEmail, 'marie@example.test');
	assert.equal(requests[1].body.fromName, 'Marie Dupont');
});

test('support does not send a message when account identity is unavailable', async () => {
	const { context, requests } = executionContext(
		{ product: 'aurentia', subject: 'Help', message: 'Please help' },
		async () => ({ success: true, data: { email: null } }),
	);
	await assert.rejects(
		() => executeGenerated.call(context, 'help', 'sendSupportRequest', 0),
		/account email/,
	);
	assert.equal(requests.length, 1);
});

const old = '2026-01-01T00:00:00.000Z';
const row = (id, time = old) => ({ id: String(id), created_at: time, published_at: time });
function source(event, readRows, failPage = () => false) {
	return async ({ qs }) => {
		const rows = readRows();
		if (event === 'taskCreated') return { success: true, data: rows };
		const offset =
			event === 'recordCreated' ? Number(qs.offset ?? 0) : (Number(qs.page ?? 1) - 1) * qs.limit;
		if (failPage(offset)) throw { statusCode: 503, message: 'Service unavailable' };
		const data = rows.slice(offset, offset + qs.limit);
		return {
			success: true,
			data: { [event === 'recordCreated' ? 'records' : 'data']: data, total: rows.length },
		};
	};
}

for (const event of [
	'contactCreated',
	'dealCreated',
	'taskCreated',
	'recordCreated',
	'postPublished',
]) {
	test(`${event}: baseline, complete pagination, large batch, late timestamps, no duplicates`, async () => {
		let rows = Array.from({ length: 1001 }, (_, i) => row(i));
		const params = {
			event,
			projectId: 'project',
			boardId: 'board',
			tableId: 'table',
			authentication: 'apiKey',
		};
		const { context, state } = pollingContext(
			params,
			source(event, () => rows),
		);
		assert.equal(
			await trigger.poll.call(context),
			null,
			'activation must not replay historical items',
		);
		// All new records are appended, deliberately behind the first page. Their
		// timestamps precede the last poll (imports, delayed commits, clock skew).
		rows.push(
			...Array.from({ length: 250 }, (_, i) => row(`new-${i}`, '2026-02-01T00:00:00+00:00')),
		);
		const emitted = await trigger.poll.call(context);
		assert.equal(emitted?.[0].length, 250);
		assert.equal(new Set(emitted[0].map((item) => item.json.id)).size, 250);
		assert.equal(await trigger.poll.call(context), null);
		// A reordered/deleted item reappearing after a scan must not replay.
		const removed = rows.pop();
		await trigger.poll.call(context);
		rows.unshift(removed);
		assert.equal(await trigger.poll.call(context), null);
		assert.ok(state.lastTimeChecked);
	});
}

test('a failed later page leaves all trigger state unchanged and can be retried', async () => {
	let rows = [row('baseline')];
	let fail = false;
	const { context, state } = pollingContext(
		{ event: 'recordCreated', tableId: 'table' },
		source(
			'recordCreated',
			() => rows,
			(offset) => fail && offset > 0,
		),
	);
	await trigger.poll.call(context);
	rows.push(...Array.from({ length: 1100 }, (_, i) => row(`new-${i}`)));
	const before = structuredClone(state);
	fail = true;
	await assert.rejects(() => trigger.poll.call(context));
	assert.deepEqual(state, before);
	fail = false;
	assert.equal((await trigger.poll.call(context))[0].length, 1100);
});

test('manual polling returns the newest item across all pages without touching state', async () => {
	const rows = [
		...Array.from({ length: 1100 }, (_, i) => row(i)),
		row('newest', '2026-09-17T00:00:00Z'),
	];
	const { context, state } = pollingContext(
		{ event: 'recordCreated', tableId: 'table' },
		source('recordCreated', () => rows),
		{},
		'manual',
	);
	const result = await trigger.poll.call(context);
	assert.equal(result[0][0].json.id, 'newest');
	assert.deepEqual(state, {});
});

test('changing the watched resource initializes a new baseline', async () => {
	const params = { event: 'contactCreated', projectId: 'project-A' };
	let rows = [row('a')];
	const { context } = pollingContext(
		params,
		source(params.event, () => rows),
	);
	await trigger.poll.call(context);
	params.projectId = 'project-B';
	rows = [row('b')];
	assert.equal(await trigger.poll.call(context), null);
	rows.push(row('c'));
	assert.deepEqual(
		(await trigger.poll.call(context))[0].map((item) => item.json.id),
		['c'],
	);
});

test('upgrading the old timestamp cursor does not replay history or lose unread items', async () => {
	const rows = [
		row('old'),
		row('seen', '2026-08-01T00:00:00Z'),
		row('new', '2026-08-02T00:00:00Z'),
	];
	const { context } = pollingContext(
		{ event: 'dealCreated', projectId: 'project' },
		source('dealCreated', () => rows),
		{ lastTimeChecked: '2026-08-01T00:00:00.000Z', seenIds: ['seen'] },
	);
	assert.deepEqual(
		(await trigger.poll.call(context))[0].map((item) => item.json.id),
		['new'],
	);
	assert.equal(await trigger.poll.call(context), null);
});

test('pagination rejects malformed pages and stalled pagination instead of returning incomplete data', async () => {
	for (const response of [
		{ total: 3 },
		{ data: 'not-an-array', total: 3 },
		{ data: [], total: 3 },
		{ data: [row('same')], total: 3 },
		{ data: [row('same')] },
	]) {
		const { context } = executionContext({}, async () => ({ success: true, data: response }));
		await assert.rejects(() => aurentiaApiRequestPaged.call(context, '/list', {}, true, 100));
	}
});

test('pagination rejects a short intermediate page even when the next page differs', async () => {
	const { context } = executionContext({}, async ({ qs }) => ({
		success: true,
		data: { data: [row(qs.page)], total: 3 },
	}));
	await assert.rejects(
		() => aurentiaApiRequestPaged.call(context, '/list', {}, true, 100),
		/incomplete list/,
	);
});

test('pagination without a total continues until an empty page, and respects a limited result count', async () => {
	const rows = Array.from({ length: 205 }, (_, i) => row(i));
	const request = async ({ qs }) => ({
		success: true,
		data: { data: rows.slice((qs.page - 1) * qs.limit, qs.page * qs.limit) },
	});
	const { context } = executionContext({}, request);
	assert.equal((await aurentiaApiRequestPaged.call(context, '/list', {}, true, 100)).length, 205);
	assert.equal((await aurentiaApiRequestPaged.call(context, '/list', {}, false, 125)).length, 125);
});

test('credit/auth/rate-limit errors are mapped from HTTP statusCode as returned by n8n', async () => {
	for (const [code, message] of [
		[401, 'Authentication'],
		[402, 'credits'],
		[429, 'rate limit'],
	]) {
		const { context } = executionContext({}, async () => {
			throw { statusCode: code, message: 'Request failed' };
		});
		await assert.rejects(
			() => aurentiaApiRequest.call(context, 'GET', '/test'),
			(error) => error.message.includes(message),
		);
	}
});

test('already wrapped HTTP errors still get an actionable credit message', async () => {
	const { context } = executionContext({}, async () => {
		throw new NodeApiError(context.getNode(), { statusCode: 402, message: 'Request failed' });
	});
	await assert.rejects(
		() => aurentiaApiRequest.call(context, 'GET', '/test'),
		/Not enough Aurentia credits/,
	);
});
