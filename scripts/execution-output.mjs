import { stripVTControlCharacters } from 'node:util';

/** Extract the execution object without requiring it to be the final log line. */
export function executionOutput(raw) {
	const output = stripVTControlCharacters(raw);
	for (const match of output.matchAll(/^\s*\{/gm)) {
		const start = output.indexOf('{', match.index);
		let depth = 0,
			quoted = false,
			escaped = false;
		for (let i = start; i < output.length; i++) {
			const char = output[i];
			if (quoted) {
				if (escaped) escaped = false;
				else if (char === '\\') escaped = true;
				else if (char === '"') quoted = false;
				continue;
			}
			if (char === '"') quoted = true;
			if (char === '{') depth++;
			if (char !== '}' || --depth !== 0) continue;
			try {
				const value = JSON.parse(output.slice(start, i + 1));
				if (value?.data?.resultData) return value;
			} catch {
				/* This log object was not an execution result. */
			}
			break;
		}
	}
	throw new Error('No complete n8n execution JSON found in stdout');
}
