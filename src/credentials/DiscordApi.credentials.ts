import { 
  IAuthenticateGeneric,
  ICredentialType,
  INodeProperties,
  ICredentialTestRequest,
} from 'n8n-workflow';

export class DiscordApi implements ICredentialType {
  name = 'discordApi';
  displayName = 'Discord OAuth2 API';
  documentationUrl = 'https://github.com/kmcbride3/n8n-nodes-discord';
  extends = ['oAuth2Api'];
  icon = 'file:discord.svg';
  
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
      default: 'bot applications.commands identify',
      required: true,
    },
    {
      displayName: 'Auth URI Query Parameters',
      name: 'authQueryParameters',
      type: 'hidden',
      default: 'response_type=code&prompt=consent',
    },
    {
      displayName: 'Authentication',
      name: 'authentication',
      type: 'hidden',
      default: 'body',
    },
    {
      displayName: 'Client ID',
      name: 'clientId',
      type: 'string',
      default: '',
      description: 'The OAuth2 Client ID from your Discord Application',
      required: true,
    },
    {
      displayName: 'Client Secret',
      name: 'clientSecret',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      description: 'The OAuth2 Client Secret from your Discord Application',
      required: true,
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
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://discord.com/api',
      url: '/v10/users/@me',
      method: 'GET',
    },
  };
}
