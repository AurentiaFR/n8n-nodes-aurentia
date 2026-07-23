#!/usr/bin/env node
/**
 * validate-generated.mjs — PRD-215 §15 (node-pure, no framework).
 *
 * Static integrity checks over the AUTO-GENERATED resource catalog:
 *   1. every operation has a valid routeSpec (method + path + queryParams array);
 *   2. operation `value`s are unique within a resource;
 *   3. resource `value`s are unique across the whole node (curated + generated);
 *   4. every `{path param}` in a routeSpec is covered by a required property;
 *   5. queryParam entries are well-formed (`inputKey` or `inputKey:queryKey`);
 *   6. no generated (method, path-shape) collides with a curated operation;
 *   7. generated resource values never reuse a reserved curated value.
 *
 * Runs against the COMPILED output (`dist/…/generated/index.js`), so the package
 * must be built first. `npm run generate:check` builds before validating.
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..');
const distIndex = resolve(pkgRoot, 'dist/nodes/Aurentia/actions/generated/index.js');

const errors = [];
const fail = (msg) => errors.push(msg);

if (!existsSync(distIndex)) {
	console.error(
		`Cannot validate: ${distIndex} is missing.\n` +
			`Run \`npm run build\` first (or use \`npm run generate:check\`, which builds).`,
	);
	process.exit(1);
}

const { GENERATED_RESOURCES, GENERATED_RESOURCE_BY_VALUE } = await import(
	pathToFileURL(distIndex).href
);

// Reserved curated resource values — generated resources must never reuse them.
const CURATED_RESOURCE_VALUES = new Set([
	'account',
	'contact',
	'deal',
	'project',
	'record',
	'socialPost',
	'task',
]);

// Curated (method, path-shape) operations — a generated op must not collide,
// EXCEPT the two intentionally-distinct tools sharing the task-card route.
const CURATED_MP = new Set([
	'POST /api/aurentia/crm/contacts',
	'GET /api/aurentia/crm/contacts',
	'GET /api/aurentia/crm/contacts/{}',
	'PUT /api/aurentia/crm/contacts/{}',
	'DELETE /api/aurentia/crm/contacts/{}',
	'POST /api/aurentia/crm/deals',
	'GET /api/aurentia/crm/deals',
	'GET /api/aurentia/crm/deals/{}',
	'PUT /api/aurentia/crm/deals/{}',
	'DELETE /api/aurentia/crm/deals/{}',
	'POST /api/aurentia/tasks/cards',
	'GET /api/aurentia/tasks/cards',
	'GET /api/aurentia/tasks/cards/{}',
	'PUT /api/aurentia/tasks/cards/{}',
	'DELETE /api/aurentia/tasks/cards/{}',
	'GET /api/aurentia/social-media/posts',
	'GET /api/aurentia/social-media/posts/{}',
	'PATCH /api/aurentia/social-media/posts/{}',
	'DELETE /api/aurentia/social-media/posts/{}',
	'POST /api/aurentia/social-media/posts/{}/schedule',
	'GET /api/aurentia/dashboard/projects',
	'GET /api/aurentia/projects/{}',
	'PATCH /api/aurentia/projects/{}',
	'DELETE /api/aurentia/projects/{}',
	'GET /api/aurentia/bases/{}',
	'GET /api/aurentia/bases/tables/{}/records',
	'PATCH /api/aurentia/bases/records/{}',
]);
// Intentional (documented) collisions: distinct narrow writes on the task-card
// route (set_card_status / set_card_owners → setCardStatus / setCardOwners).
const ALLOWED_COLLISION_VALUES = new Set(['setCardStatus', 'setCardOwners']);

const shape = (p) => p.replace(/\{[^}]+\}/g, '{}');
const VALID_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

const seenResourceValues = new Set(CURATED_RESOURCE_VALUES);

if (!Array.isArray(GENERATED_RESOURCES) || GENERATED_RESOURCES.length === 0) {
	fail('GENERATED_RESOURCES is empty or not an array.');
}

let totalOps = 0;

for (const resource of GENERATED_RESOURCES ?? []) {
	const rid = resource.resource;
	if (!rid || typeof rid !== 'string') {
		fail(`Resource with missing/invalid \`resource\` value: ${JSON.stringify(resource.displayName)}`);
		continue;
	}
	// (3) + (7) resource value uniqueness + no reserved reuse.
	if (CURATED_RESOURCE_VALUES.has(rid)) {
		fail(`Generated resource "${rid}" reuses a reserved curated resource value.`);
	}
	if (seenResourceValues.has(rid) && !CURATED_RESOURCE_VALUES.has(rid)) {
		fail(`Duplicate generated resource value "${rid}".`);
	}
	seenResourceValues.add(rid);

	if (!GENERATED_RESOURCE_BY_VALUE[rid]) {
		fail(`Resource "${rid}" is not present in GENERATED_RESOURCE_BY_VALUE.`);
	}

	if (!Array.isArray(resource.operations) || resource.operations.length === 0) {
		fail(`Resource "${rid}" has no operations.`);
		continue;
	}

	// (2) unique operation values per resource.
	const opValues = new Set();

	for (const op of resource.operations) {
		totalOps++;
		if (!op.value || typeof op.value !== 'string') {
			fail(`Resource "${rid}" has an operation with a missing value.`);
			continue;
		}
		if (opValues.has(op.value)) {
			fail(`Resource "${rid}" has duplicate operation value "${op.value}".`);
		}
		opValues.add(op.value);

		// (1) routeSpec validity.
		const rs = op.routeSpec;
		if (!rs || typeof rs !== 'object') {
			fail(`Operation "${rid}.${op.value}" has no routeSpec.`);
			continue;
		}
		if (!VALID_METHODS.has(rs.method)) {
			fail(`Operation "${rid}.${op.value}" has invalid method "${rs.method}".`);
		}
		if (typeof rs.path !== 'string' || !rs.path.startsWith('/api/')) {
			fail(`Operation "${rid}.${op.value}" has invalid path "${rs.path}".`);
		}
		if (!Array.isArray(rs.queryParams)) {
			fail(`Operation "${rid}.${op.value}" routeSpec.queryParams is not an array.`);
		}

		// (5) queryParam entries well-formed.
		for (const qp of rs.queryParams ?? []) {
			if (typeof qp !== 'string' || qp.length === 0) {
				fail(`Operation "${rid}.${op.value}" has a malformed queryParam entry ${JSON.stringify(qp)}.`);
				continue;
			}
			const parts = qp.split(':');
			if (parts.length > 2 || parts.some((s) => s.length === 0)) {
				fail(`Operation "${rid}.${op.value}" has a malformed queryParam mapping "${qp}".`);
			}
		}

		// (4) every {path param} covered by a required property.
		const pathParams = [...String(rs.path).matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
		const propNames = new Set((op.properties ?? []).map((p) => p.name));
		for (const pp of pathParams) {
			const prop = (op.properties ?? []).find((p) => p.name === pp);
			if (!prop) {
				fail(`Operation "${rid}.${op.value}" path param "${pp}" has no matching property.`);
			} else if (!prop.required) {
				fail(`Operation "${rid}.${op.value}" path param "${pp}" property is not required.`);
			}
		}
		void propNames;

		// (6) no collision with a curated operation (unless allowlisted).
		const mp = `${rs.method} ${shape(rs.path)}`;
		if (CURATED_MP.has(mp) && !ALLOWED_COLLISION_VALUES.has(op.value)) {
			fail(
				`Operation "${rid}.${op.value}" (${mp}) collides with a curated operation and is not allowlisted.`,
			);
		}
	}
}

if (errors.length > 0) {
	console.error(`validate-generated: ${errors.length} problem(s):`);
	for (const e of errors) console.error(`  - ${e}`);
	process.exit(1);
}

console.log(
	`validate-generated: OK — ${GENERATED_RESOURCES.length} resources, ${totalOps} operations, no collisions.`,
);
