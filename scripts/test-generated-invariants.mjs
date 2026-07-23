/**
 * Invariants for the AUTO-GENERATED operations.
 *
 * Standalone (node:assert, no framework, reads the COMPILED catalog from
 * `dist/`) so it also runs in the public mirror CI where the registry is not
 * available.
 *
 * 1. NO onboarding / UI-only artifact field ever leaks into a node operation.
 *    The node is data-in / data-out: fields that only exist to drive the
 *    interactive app onboarding must never be surfaced. If a registry tool ever
 *    starts exposing one, this fails loudly instead of silently shipping a
 *    meaningless field to n8n users.
 * 2. Every operation is well-formed (unique values per resource, a valid
 *    routeSpec, every path param backed by a property).
 *
 * Run: npm run build && node scripts/test-generated-invariants.mjs
 */
import assert from 'node:assert/strict';
import { GENERATED_RESOURCES } from '../dist/nodes/Aurentia/actions/generated/index.js';

/**
 * Field names that only make sense inside the interactive app onboarding /
 * wizard UX and must never appear as a node input. Matched case-insensitively
 * against every property name (top-level and inside collections).
 */
const ONBOARDING_ONLY_FIELDS = new Set(
	[
		'onboardingMessages',
		'selectedNeeds',
		'preferredLanguageName',
		'onboardingData',
		'wizardStep',
	].map((s) => s.toLowerCase()),
);

let passed = 0;
const ok = (label) => {
	passed++;
	console.log(`  ✓ ${label}`);
};

/** Recursively collect every property name in a properties array. */
function collectNames(properties, acc = []) {
	for (const p of properties ?? []) {
		acc.push(p.name);
		if (Array.isArray(p.options)) {
			for (const opt of p.options) {
				// collection / fixedCollection options carry nested `values`/props
				if (Array.isArray(opt.values)) collectNames(opt.values, acc);
				if (Array.isArray(opt.options)) collectNames(opt.options, acc);
				// a plain collection lists its fields directly under `options`
				if (opt && typeof opt === 'object' && 'name' in opt && 'type' in opt) acc.push(opt.name);
			}
		}
	}
	return acc;
}

console.log('test-generated-invariants:');

// Invariant 1 — no onboarding/UI-only artifact leaks.
{
	const offenders = [];
	for (const res of GENERATED_RESOURCES) {
		for (const op of res.operations) {
			for (const name of collectNames(op.properties)) {
				if (ONBOARDING_ONLY_FIELDS.has(String(name).toLowerCase())) {
					offenders.push(`${res.resource}.${op.value} → "${name}"`);
				}
			}
		}
	}
	assert.deepEqual(
		offenders,
		[],
		`onboarding/UI-only fields leaked into generated ops:\n  ${offenders.join('\n  ')}`,
	);
	ok('no onboarding/UI-only artifact field is exposed by any generated operation');
}

// Invariant 2 — well-formed operations.
{
	let opCount = 0;
	for (const res of GENERATED_RESOURCES) {
		const seen = new Set();
		for (const op of res.operations) {
			opCount++;
			assert.ok(op.value && !seen.has(op.value), `duplicate op value ${res.resource}.${op.value}`);
			seen.add(op.value);
			assert.ok(op.routeSpec?.method && op.routeSpec?.path, `missing routeSpec on ${res.resource}.${op.value}`);
			const pathParams = [...op.routeSpec.path.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
			const propNames = new Set(collectNames(op.properties));
			for (const pp of pathParams) {
				assert.ok(propNames.has(pp), `path param "${pp}" has no property in ${res.resource}.${op.value}`);
			}
		}
	}
	ok(`${opCount} operations across ${GENERATED_RESOURCES.length} resources are well-formed`);
}

console.log(`\ntest-generated-invariants: OK — ${passed} checks passed.`);
