import crypto from 'crypto';
import type { IntegrationName, User } from '../../shared/types';
import { db, initDb } from '../../infrastructure/db';

export const listIntegrations = async (user: User) => {
  await initDb();
  const definitions: { id: IntegrationName; label: string; description: string; docsUrl: string }[] = [
    {
      id: 'google',
      label: 'Gmail',
      description: 'Sync sent mail to continuously refine your professional tone.',
      docsUrl: 'https://developers.google.com/gmail/api',
    },
    {
      id: 'facebook',
      label: 'Messenger',
      description: 'Bring in casual conversations to replicate personal voice.',
      docsUrl: 'https://developers.facebook.com/docs/messenger-platform',
    },
    {
      id: 'slack',
      label: 'Slack',
      description: 'Draft stand-ups and async updates directly from Slack history.',
      docsUrl: 'https://api.slack.com/',
    },
    {
      id: 'notion',
      label: 'Notion',
      description: 'Summarise docs and keep knowledge bases aligned with your tone.',
      docsUrl: 'https://developers.notion.com/',
    },
    {
      id: 'zapier',
      label: 'Zapier',
      description: 'Connect Scribe to any of the 6000+ Zapier integrations in minutes.',
      docsUrl: 'https://platform.zapier.com',
    },
    {
      id: 'webhook',
      label: 'Outbound Webhooks',
      description: 'Receive callbacks when new drafts are created or reviewed.',
      docsUrl: 'https://scribe.ai/docs/webhooks',
    },
  ];

  const integrations = user.integrations || [];
  return definitions.map((definition) => ({
    ...definition,
    connected: integrations.some(
      (integration: NonNullable<User['integrations']>[number]) =>
        integration.id === definition.id && integration.connectedAt
    ),
    connectedAt: integrations.find(
      (integration: NonNullable<User['integrations']>[number]) => integration.id === definition.id
    )?.connectedAt,
  }));
};

export const disconnectIntegration = async (user: User, integration: IntegrationName) => {
  await initDb();
  if (integration === 'google') {
    user.google = undefined;
  }
  if (integration === 'facebook') {
    user.facebook = undefined;
  }
  user.integrations = (user.integrations || []).map((item) =>
    item.id === integration ? { ...item, connectedAt: undefined } : item
  );
  await db.write();
};

export const connectIntegration = async (user: User, integration: IntegrationName) => {
  await initDb();
  user.integrations = user.integrations || [];
  const existing = user.integrations.find((item) => item.id === integration);
  if (existing) {
    existing.connectedAt = new Date().toISOString();
  } else {
    user.integrations.push({ id: integration, connectedAt: new Date().toISOString() });
  }
  await db.write();
};

export const getOrCreateWebhookSecret = async (user: User) => {
  await initDb();
  let secret = db.data.webhookSecrets.find((item) => item.id === user.id);
  if (!secret) {
    secret = {
      id: user.id,
      secret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date().toISOString(),
    };
    db.data.webhookSecrets.push(secret);
    await db.write();
  }
  return secret.secret;
};
