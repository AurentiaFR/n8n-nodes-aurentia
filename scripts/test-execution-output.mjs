import assert from 'node:assert/strict';
import { test } from 'node:test';
import { executionOutput } from './execution-output.mjs';

test('execution output permits surrounding logs, ANSI and braces in JSON strings', () => {
	const result = { data: { resultData: { text: 'a } and "quoted" { value' } }, finished: true };
	const output =
		'\u001b[32mStarting n8n\u001b[0m\n' +
		JSON.stringify({ log: true }) +
		'\n' +
		JSON.stringify(result, null, 2) +
		'\nTask runner stopped\n';
	assert.deepEqual(executionOutput(output), result);
});

test('execution output does not turn truncated results or plain logs into a passing execution', () => {
	assert.throws(() => executionOutput('Execution started\n{}\n'), /No complete/);
	assert.throws(() => executionOutput('{"data":{"resultData":{}'), /No complete/);
	const result = { data: { resultData: { error: { message: 'Failure' } } }, finished: false };
	assert.deepEqual(executionOutput(JSON.stringify(result)), result);
});
