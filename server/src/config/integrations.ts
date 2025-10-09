import { IntegrationDescriptor } from '../../../types';

export const integrationCatalog: IntegrationDescriptor[] = [
  {
    id: 'google',
    name: 'Google Workspace',
    description: 'Sync Gmail, Calendar, and Docs to teach Scribe how you communicate across channels.',
    category: 'email',
    scopes: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/calendar.readonly',
    ],
    documentationUrl: 'https://developers.google.com/workspace',
    status: 'stable',
  },
  {
    id: 'facebook',
    name: 'Meta Messenger',
    description: 'Pull message history from Facebook and Instagram DM to understand your conversational tone.',
    category: 'messaging',
    scopes: ['pages_show_list', 'pages_messaging'],
    documentationUrl: 'https://developers.facebook.com/docs/messenger-platform/',
    status: 'beta',
  },
  {
    id: 'slack',
    name: 'Slack',
    description: "Let Scribe answer internal questions by connecting your team's Slack workspace.",
    category: 'messaging',
    scopes: ['channels:history', 'chat:write', 'users:read'],
    documentationUrl: 'https://api.slack.com/',
    status: 'coming_soon',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Surface AI generated replies enriched with customer context from Salesforce.',
    category: 'crm',
    scopes: ['api', 'refresh_token'],
    documentationUrl: 'https://developer.salesforce.com/',
    status: 'coming_soon',
  },
];
