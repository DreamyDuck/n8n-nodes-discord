import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class DiscordOAuth2Api implements ICredentialType {
  name = 'discordOAuth2Api';
  displayName = 'Discord OAuth2 API';
  documentationUrl = 'https://discord.com/developers/docs/topics/oauth2';
  extends = ['oAuth2Api'];
  
  properties: INodeProperties[] = [
    {
      displayName: 'Grant Type',
      name: 'grantType',
      type: 'hidden',
      default: 'authorizationCode',
    },
    {
      displayName: 'Authorization URL',
      name: 'authUrl',
      type: 'hidden',
      default: 'https://discord.com/api/oauth2/authorize',
      required: true,
    },
    {
      displayName: 'Access Token URL',
      name: 'accessTokenUrl',
      type: 'hidden',
      default: 'https://discord.com/api/oauth2/token',
      required: true,
    },
    {
      displayName: 'Scope',
      name: 'scope',
      type: 'hidden',
      default: 'bot applications.commands identify guilds',
      required: true,
    },
    {
      displayName: 'Auth URI Query Parameters',
      name: 'authQueryParameters',
      type: 'hidden',
      default: 'prompt=none&response_type=code&permissions=8',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'hidden',
      default: 'body',
    },
    {
      displayName: 'n8n API key',
      name: 'apiKey',
      description: 'The API key of the n8n server',
      type: 'string',
      default: '',
    },
    {
      displayName: 'Base URL',
      name: 'baseUrl',
      description: 'The API URL of the n8n instance',
      type: 'string',
      default: '',
      placeholder: 'https://n8n.example.com/api/v1',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '=Bearer {{$credentials.access_token}}',
        'User-Agent': 'DiscordBot (https://www.discord.com, 1)',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://discord.com/api/v10',
      url: '/users/@me',
      method: 'GET',
    },
  };
} 