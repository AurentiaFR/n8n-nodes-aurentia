/**
 * Turn the AUTO-GENERATED resource catalog (pure data) into the n8n
 * `INodeProperties[]` consumed by `versionDescription.ts`:
 *   - one Resource dropdown fragment (options for the generated resources),
 *   - one Operation dropdown per generated resource (scoped by resource),
 *   - every operation's fields, scoped by resource + operation.
 *
 * Hand-written (NOT generated) so the wiring stays small: the node description
 * spreads `generatedProperties` and merges `generatedResourceOptions` into the
 * Resource dropdown. Deterministic ordering (resources and operations already
 * sorted by the generator) keeps the node description stable.
 */
import type { INodeProperties, INodePropertyOptions } from 'n8n-workflow';

import { GENERATED_RESOURCES } from './index';

/** Resource dropdown options for every generated resource (unsorted; the caller merges + sorts). */
export const generatedResourceOptions: INodePropertyOptions[] = GENERATED_RESOURCES.map((r) => ({
	name: r.displayName,
	value: r.resource,
}));

/** All property fragments for the generated resources (operation dropdowns + fields). */
export const generatedProperties: INodeProperties[] = GENERATED_RESOURCES.flatMap((r) => {
	const operationDropdown: INodeProperties = {
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: [r.resource] } },
		options: r.operations
			.map((o) => {
				// Drop the option description when it is trivially identical to the
				// name (node-param-option-description-identical-to-name).
				const triviaLess = o.description.replace(/^The\s/, '').replace(/\.$/, '');
				const omitDescription = triviaLess.toLowerCase() === o.name.toLowerCase();
				return {
					name: o.name,
					value: o.value,
					...(omitDescription ? {} : { description: o.description }),
					action: o.action,
				};
			})
			.sort((a, b) => a.name.localeCompare(b.name)),
		default: '',
	};

	const fields: INodeProperties[] = r.operations.flatMap((o) =>
		o.properties.map((p) => ({
			...p,
			displayOptions: {
				...p.displayOptions,
				show: {
					resource: [r.resource],
					operation: [o.value],
					...p.displayOptions?.show,
				},
			},
		})),
	);

	return [operationDropdown, ...fields];
});
