import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AurentiaApi implements ICredentialType {
	name = 'aurentiaApi';

	displayName = 'Aurentia API';

	icon: Icon = { light: 'file:../icons/aurentia.svg', dark: 'file:../icons/aurentia.dark.svg' };

	documentationUrl =
		'https://github.com/AurentiaFR/n8n-nodes-aurentia?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'e.g. aur_1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
			description:
				'Generate it in Aurentia under Settings > Integrations. Generating a new key revokes the previous one.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.aurentia.fr',
			description: 'Only change this to target a local or staging Aurentia instance',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: { Authorization: '=Bearer {{$credentials.apiKey}}' },
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl}}',
			url: '/api/aurentia/me',
			method: 'GET',
			headers: { 'X-Aurentia-Integration': 'n8n' },
		},
	};
}
