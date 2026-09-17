import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { Aurentia } from '../dist/nodes/Aurentia/Aurentia.node.js';
import { GENERATED_RESOURCE_BY_VALUE } from '../dist/nodes/Aurentia/actions/generated/index.js';
import { executionContext } from './test-context.mjs';

const action = new Aurentia();
const examples = new URL('../examples/', import.meta.url);
const files = (await readdir(examples)).filter((name) => name.endsWith('.json'));
test('five credential-free, inactive templates have valid graphs and available operations', async () => {
	assert.equal(files.length, 5);
	for (const file of files) {
		const workflow = JSON.parse(await readFile(new URL(file, examples), 'utf8'));
		assert.equal(workflow.active, false);
		const names = new Set(workflow.nodes.map((node) => node.name));
		assert.equal(names.size, workflow.nodes.length);
		assert.equal(new Set(workflow.nodes.map((node) => node.id)).size, workflow.nodes.length);
		for (const [source, connection] of Object.entries(workflow.connections)) {
			assert.ok(names.has(source));
			for (const branch of connection.main)
				for (const target of branch) assert.ok(names.has(target.node));
		}
		for (const node of workflow.nodes) {
			assert.equal(node.credentials, undefined, 'never ship account credentials');
			for (const match of JSON.stringify(node.parameters).matchAll(/\$\('([^']+)'\)/g))
				assert.ok(names.has(match[1]), `missing expression reference ${match[1]}`);
			if (node.type !== '@aurentiaai/n8n-nodes-aurentia.aurentia') continue;
			const { resource, operation } = node.parameters;
			const generated = GENERATED_RESOURCE_BY_VALUE[resource];
			if (generated) assert.ok(generated.operations.some((op) => op.value === operation));
			else {
				const options = action.description.properties.find(
					(p) => p.name === 'operation' && p.displayOptions?.show?.resource?.includes(resource),
				);
				assert.ok(
					options?.options?.some((op) => op.value === operation),
					`${resource}.${operation}`,
				);
			}
		}
	}
});

test('the real action node preserves item links and isolates a failed input in a batch', async () => {
	const params = ['Marie', '', 'Noé'].map((firstName) => ({
		resource: 'contact',
		operation: 'create',
		projectId: { value: 'project' },
		firstName,
	}));
	const { context, requests } = executionContext(params, async ({ body }) => ({
		success: true,
		data: { ...body, id: body.first_name },
	}));
	context.getInputData = () => params.map(() => ({ json: {} }));
	context.continueOnFail = () => true;
	const [items] = await action.execute.call(context);
	assert.deepEqual(
		items.map((item) => item.pairedItem.item),
		[0, 1, 2],
	);
	assert.equal(items[0].json.id, 'Marie');
	assert.match(items[1].json.error, /First Name/);
	assert.equal(items[2].json.id, 'Noé');
	assert.equal(requests.length, 2);
});

test('action validation errors keep their type and failing item index', async () => {
	const { context } = executionContext({
		resource: 'contact',
		operation: 'create',
		projectId: { value: 'project' },
	});
	await assert.rejects(
		() => action.execute.call(context),
		(error) => error.name === 'NodeOperationError' && error.context.itemIndex === 0,
	);
});

test('both auth methods use the same transport and preserve zero/false in generated writes', async () => {
	for (const authentication of ['apiKey', 'oAuth2']) {
		const { context, requests } = executionContext({
			resource: 'notes',
			operation: 'addNoteTab',
			authentication,
			id: 'note',
			block_id: 'block',
			label: 'Tab',
			additionalFields: { position: 0 },
		});
		await action.execute.call(context);
		assert.equal(
			requests[0].type,
			authentication === 'apiKey' ? 'aurentiaApi' : 'aurentiaOAuth2Api',
		);
		assert.equal(requests[0].body.position, 0);
		assert.equal(requests[0].headers['X-Aurentia-Integration'], 'n8n');
	}
});
