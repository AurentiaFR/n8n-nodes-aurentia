/** Real n8n engine + imported credentials + HTTP contract simulator. No production access. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, readdir, symlink, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageInfo = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const folder = await mkdtemp(join(tmpdir(), 'aurentia-n8n-e2e-'));
const requests = [];
const fixture = {
	id: 'contact-1',
	first_name: 'Marie',
	Email: 'marie@example.test',
	Name: 'Marie',
	Company: 'Example',
	title: 'Launch',
	content: { text: 'Launch announcement' },
};
const records = Array.from({ length: 1103 }, (_, i) => ({
	id: `record-${i}`,
	cells: { field: i },
}));
const deals = Array.from({ length: 205 }, (_, i) => ({
	id: `deal-${i}`,
	title: `Deal ${i}`,
	value: i,
	currency: 'EUR',
}));
const server = createServer(async (req, res) => {
	try {
		const url = new URL(req.url, 'http://localhost');
		let raw = '';
		for await (const chunk of req) raw += chunk;
		const body = raw ? JSON.parse(raw) : undefined;
		requests.push({
			method: req.method,
			path: url.pathname,
			qs: Object.fromEntries(url.searchParams),
			body,
			auth: req.headers.authorization,
		});
		if (url.pathname !== '/notify') {
			assert.ok(
				['Bearer aur_local_fixture', 'Bearer local-oauth'].includes(req.headers.authorization),
				'credential must be applied by n8n',
			);
			assert.equal(req.headers['x-aurentia-integration'], 'n8n');
		}
		let data;
		if (req.method === 'POST' && url.pathname.endsWith('/crm/contacts')) {
			assert.equal(body.email, fixture.Email);
			data = { ...body, id: 'contact-1' };
		} else if (req.method === 'POST' && url.pathname.endsWith('/crm/deals')) {
			assert.equal(body.contact_id, 'contact-1');
			data = { ...body, id: 'created-deal' };
		} else if (req.method === 'POST' && url.pathname.endsWith('/tasks/cards')) {
			assert.ok(body.boardId && body.columnId && body.title);
			data = { ...body, id: 'created-task' };
		} else if (req.method === 'GET' && url.pathname.endsWith('/crm/deals')) {
			const size = Number(url.searchParams.get('limit')),
				page = Number(url.searchParams.get('page'));
			data = { data: deals.slice((page - 1) * size, page * size), total: deals.length };
		} else if (req.method === 'POST' && url.pathname === '/api/notes') {
			assert.ok(body.project_id);
			assert.match(body.content, /Deal 204/);
			data = { ...body, id: 'note-1' };
		} else if (req.method === 'GET' && url.pathname === '/api/aurentia/artifacts') {
			assert.equal(url.searchParams.get('projectId'), 'project-A');
			assert.equal(url.searchParams.has('project_id'), false);
			data = { id: 'artifact-1' };
		} else if (req.method === 'GET' && url.pathname === '/api/aurentia/decisions') {
			assert.equal(url.searchParams.get('tags'), 'launch,sales');
			data = { id: 'decision-1' };
		} else if (req.method === 'GET' && url.pathname === '/api/account/profile') {
			data = { email: fixture.Email, firstName: 'Marie', lastName: 'Dupont' };
		} else if (req.method === 'POST' && url.pathname === '/api/help/support-request') {
			assert.equal(body.fromEmail, fixture.Email);
			assert.equal(body.fromName, 'Marie Dupont');
			assert.equal(body.subject, 'Local contract test');
			data = { sent: true };
		} else if (req.method === 'GET' && url.pathname.endsWith('/records')) {
			const size = Number(url.searchParams.get('limit')),
				offset = Number(url.searchParams.get('offset'));
			data = { records: records.slice(offset, offset + size), total: records.length };
		} else if (req.method === 'POST' && url.pathname === '/notify') {
			assert.match(body.text, /Launch/);
			data = { delivered: true };
		} else {
			res.writeHead(404);
			res.end(JSON.stringify({ error: `Unexpected route ${req.method} ${url.pathname}` }));
			return;
		}
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ success: true, data }));
	} catch (error) {
		res.writeHead(400, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: error.message }));
	}
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const baseUrl = `http://127.0.0.1:${server.address().port}`;
const env = {
	...process.env,
	N8N_USER_FOLDER: folder,
	DB_TYPE: 'sqlite',
	DB_SQLITE_DATABASE: join(folder, 'database.sqlite'),
	EXECUTIONS_MODE: 'regular',
	N8N_RUNNERS_MODE: 'internal',
	N8N_ENCRYPTION_KEY: 'local-e2e-fixture-key-not-a-real-secret',
	N8N_DIAGNOSTICS_ENABLED: 'false',
	N8N_VERSION_NOTIFICATIONS_ENABLED: 'false',
	N8N_TEMPLATES_ENABLED: 'false',
	N8N_RUNNERS_BROKER_PORT: String(server.address().port + 1),
	N8N_COMMUNITY_PACKAGES_ALLOW_TOOL_USAGE: 'true',
	N8N_LOG_LEVEL: 'info',
	N8N_BLOCK_ENV_ACCESS_IN_NODE: 'true',
};
const cli = process.env.N8N_TEST_CLI;
async function run(args, label) {
	return new Promise((done, reject) => {
		const child = spawn(
			cli ?? 'npm',
			cli ? args : ['exec', '--yes', '--package=n8n@2.39.7', '--', 'n8n', ...args],
			{ cwd: folder, env },
		);
		let output = '';
		child.stdout.on('data', (chunk) => {
			output += chunk;
		});
		child.stderr.on('data', (chunk) => {
			output += chunk;
		});
		const timeout = setTimeout(() => child.kill('SIGTERM'), 180000);
		child.on('error', reject);
		child.on('close', async (code) => {
			clearTimeout(timeout);
			await writeFile(join(folder, `${label}.log`), output);
			if (code !== 0)
				reject(
					new Error(`${label} exited ${code}. See ${folder}/${label}.log\n${output.slice(-3000)}`),
				);
			else done(output);
		});
	});
}

try {
	const custom = join(folder, '.n8n', 'nodes', 'node_modules', '@aurentiaai');
	await mkdir(custom, { recursive: true });
	await symlink(root, join(custom, 'n8n-nodes-aurentia'), 'dir');
	await writeFile(
		join(folder, '.n8n', 'nodes', 'package.json'),
		JSON.stringify({ dependencies: { [packageInfo.name]: packageInfo.version } }),
	);
	const credentials = [
		{
			id: 'aurentia-e2e-key',
			name: 'Local API fixture',
			type: 'aurentiaApi',
			data: { baseUrl, apiKey: 'aur_local_fixture' },
		},
		{
			id: 'aurentia-e2e-oauth',
			name: 'Local OAuth fixture',
			type: 'aurentiaOAuth2Api',
			data: {
				baseUrl,
				grantType: 'pkce',
				clientId: 'local-client',
				clientSecret: 'local-secret',
				oauthTokenData: { access_token: 'local-oauth', token_type: 'Bearer' },
			},
		},
	];
	await writeFile(join(folder, 'credentials.json'), JSON.stringify(credentials));
	await run(['import:credentials', `--input=${join(folder, 'credentials.json')}`], 'credentials');
	for (const [index, file] of (await readdir(join(root, 'examples')))
		.filter((f) => f.endsWith('.json'))
		.sort()
		.entries()) {
		const workflow = JSON.parse(await readFile(join(root, 'examples', file), 'utf8'));
		const id = `aurentia-e2e-${index}`;
		workflow.id = id;
		const entry = workflow.nodes.find((node) => /Trigger$/.test(node.type));
		assert.ok(entry, `${file}: missing trigger`);
		// Only the external input is replaced; every business node, expression,
		// connection and parameter below is imported from the shipped template.
		entry.type = 'n8n-nodes-base.set';
		entry.typeVersion = 3.4;
		entry.parameters = { mode: 'raw', jsonOutput: JSON.stringify(fixture), options: {} };
		workflow.nodes.push({
			id: 'manual',
			name: 'Manual test input',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [-240, 0],
			parameters: {},
		});
		workflow.connections['Manual test input'] = {
			main: [[{ node: entry.name, type: 'main', index: 0 }]],
		};
		for (const node of workflow.nodes) {
			if (node.name === 'Configuration')
				for (const field of node.parameters.assignments.assignments)
					if (field.name === 'notificationUrl') field.value = `${baseUrl}/notify`;
			if (node.type === '@aurentiaai/n8n-nodes-aurentia.aurentia') {
				const cred = credentials[index === 1 ? 1 : 0];
				node.parameters.authentication = index === 1 ? 'oAuth2' : 'apiKey';
				node.credentials = { [cred.type]: { id: cred.id, name: cred.name } };
			}
		}
		const input = join(folder, file);
		await writeFile(input, JSON.stringify(workflow));
		await run(['import:workflow', `--input=${input}`], `import-${index}`);
		const output = await run(['execute', `--id=${id}`, '--rawOutput'], `execute-${index}`);
		const match = output.match(/\{\s*"[\s\S]*\}\s*$/);
		assert.ok(match, `No execution result for ${file}. See ${folder}/execute-${index}.log`);
		const result = JSON.parse(match[0]);
		assert.equal(
			result.data.resultData.error,
			undefined,
			JSON.stringify(result.data.resultData.error),
		);
		assert.ok(result.finished || result.status === 'success', `${file}: execution must finish`);
		if (index === 4) {
			const fileData = result.data.resultData.runData['Export JSON'][0].data.main[0][0].binary.data;
			assert.equal(fileData.fileName, 'aurentia-records.json');
			assert.equal(fileData.mimeType, 'application/json');
			assert.ok(fileData.id.startsWith('filesystem-v2:workflows/'));
			const exported = JSON.parse(
				await readFile(
					join(folder, '.n8n', 'storage', fileData.id.slice('filesystem-v2:'.length)),
					'utf8',
				),
			);
			assert.deepEqual(exported, records, 'the downloadable file must contain every original row');
		}
		console.log(`PASS real n8n ${file}${index === 1 ? ' (OAuth credential)' : ''}`);
	}
	const generatedWorkflow = {
		id: 'aurentia-generated-e2e',
		name: 'Generated query contracts',
		active: false,
		settings: { executionOrder: 'v1' },
		nodes: [
			{
				id: 'manual',
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			...[
				['Artifacts', 'artifacts', 'listArtifacts', { project_id: 'project-A' }],
				['Decisions', 'decisions', 'listDecisions', { tags: '["launch","sales"]' }],
				[
					'Support',
					'help',
					'sendSupportRequest',
					{},
					{
						product: 'aurentia',
						subject: 'Local contract test',
						message: 'Simulated message',
					},
				],
			].map(([name, resource, operation, additionalFields, fields = {}], i) => ({
				id: name,
				name,
				type: '@aurentiaai/n8n-nodes-aurentia.aurentia',
				typeVersion: 1,
				position: [240 * (i + 1), 0],
				parameters: { authentication: 'apiKey', resource, operation, additionalFields, ...fields },
				credentials: { aurentiaApi: { id: credentials[0].id, name: credentials[0].name } },
			})),
		],
		connections: {
			Start: { main: [[{ node: 'Artifacts', type: 'main', index: 0 }]] },
			Artifacts: { main: [[{ node: 'Decisions', type: 'main', index: 0 }]] },
			Decisions: { main: [[{ node: 'Support', type: 'main', index: 0 }]] },
		},
	};
	await writeFile(join(folder, 'generated.json'), JSON.stringify(generatedWorkflow));
	await run(['import:workflow', `--input=${join(folder, 'generated.json')}`], 'import-generated');
	const generatedOutput = await run(
		['execute', `--id=${generatedWorkflow.id}`, '--rawOutput'],
		'execute-generated',
	);
	const generatedResult = JSON.parse(generatedOutput.match(/\{\s*"[\s\S]*\}\s*$/)?.[0] ?? '{}');
	assert.ok(
		generatedResult.finished || generatedResult.status === 'success',
		JSON.stringify(generatedResult.data?.resultData?.error),
	);
	assert.equal(generatedResult.data.resultData.error, undefined);
	assert.ok(requests.some((r) => r.path === '/api/aurentia/decisions'));
	assert.equal(requests.filter((r) => r.path === '/api/help/support-request').length, 1);
	console.log('PASS real n8n optional project alias, JSON array query and support compatibility');
	assert.ok(requests.some((r) => r.auth === 'Bearer local-oauth'));
	assert.equal(
		requests.filter((r) => r.path.endsWith('/crm/deals') && r.method === 'GET').length,
		3,
	);
	assert.equal(requests.filter((r) => r.path.endsWith('/records')).length, 3);
	await writeFile(join(folder, 'requests.json'), JSON.stringify(requests, null, 2));
	console.log(`All 5 templates executed in n8n 2.39.7. Evidence: ${folder}`);
} finally {
	server.closeAllConnections();
	await new Promise((done) => server.close(done));
	// Keep execution evidence, remove imported local fixture credentials.
	await rm(join(folder, 'credentials.json'), { force: true });
}
