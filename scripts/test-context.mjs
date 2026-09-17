/** n8n context double; HTTP is the only external boundary replaced in unit tests. */
export function executionContext(params, request = async () => ({ success: true, data: {} })) {
	const requests = [];
	const context = {
		getNode: () => ({
			name: 'Aurentia',
			type: '@aurentiaai/n8n-nodes-aurentia.aurentia',
			typeVersion: 1,
			parameters: {},
		}),
		getInputData: () => [{ json: {} }],
		getNodeParameter(name, index, fallback, options) {
			const parameters = Array.isArray(params) ? params[index] : params;
			const value = parameters[name] ?? (Object.hasOwn(parameters, name) ? null : fallback);
			if (value === undefined) throw new Error(`Parameter not found: ${name}`);
			return options?.extractValue && typeof value === 'object' ? value.value : value;
		},
		getCredentials: async (type) => ({ baseUrl: 'https://example.invalid/', type }),
		continueOnFail: () => false,
		helpers: {
			async httpRequestWithAuthentication(type, options) {
				requests.push({ type, ...structuredClone(options) });
				return request(options, type);
			},
			returnJsonArray: (data) => (Array.isArray(data) ? data : [data]).map((json) => ({ json })),
			constructExecutionMetaData: (items, { itemData }) =>
				items.map((item) => ({ ...item, pairedItem: itemData })),
		},
	};
	return { context, requests };
}

export function pollingContext(params, request, state = {}, mode = 'trigger') {
	const { context, requests } = executionContext(params, request);
	delete context.getInputData;
	context.getNodeParameter = (name, fallback, options) => {
		const value = params[name] ?? fallback;
		return options?.extractValue && typeof value === 'object' ? value.value : value;
	};
	context.getWorkflowStaticData = () => state;
	context.getMode = () => mode;
	return { context, requests, state };
}
