import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class AurentiaOAuth2Api implements ICredentialType {
	name = 'aurentiaOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Aurentia OAuth2 API';

	icon: Icon = { light: 'file:../icons/aurentia.svg', dark: 'file:../icons/aurentia.dark.svg' };

	documentationUrl =
		'https://github.com/AurentiaFR/n8n-nodes-aurentia?tab=readme-ov-file#credentials';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://app.aurentia.fr',
			description: 'Only change this to target a local or staging Aurentia instance',
		},
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'pkce',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '={{$self["baseUrl"]}}/api/mcp/oauth/authorize',
			required: true,
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '={{$self["baseUrl"]}}/api/mcp/oauth/token',
			required: true,
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: 'mcp:tools mcp:resources mcp:prompts',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
