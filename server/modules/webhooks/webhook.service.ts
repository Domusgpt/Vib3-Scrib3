import { createHmac, randomBytes } from 'crypto';
import { db } from '../../database/client';
import { WebhookEvent, WebhookSubscription } from '../../types';
import { auditService } from '../audit/audit.service';

const DEFAULT_EVENTS: WebhookEvent[] = [
  'chat.completed',
  'profile.created',
  'profile.updated',
  'billing.invoice.created',
];

const buildSignature = (secret: string, payload: string) =>
  createHmac('sha256', secret).update(payload).digest('hex');

class WebhookService {
  async list(organizationId: string): Promise<WebhookSubscription[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return db.data.webhooks
      .filter(webhook => webhook.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(params: {
    organizationId: string;
    actorId: string;
    url: string;
    events?: WebhookEvent[];
  }): Promise<WebhookSubscription> {
    const { organizationId, actorId, url, events } = params;

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const secret = randomBytes(24).toString('hex');
    const now = new Date().toISOString();

    const webhook: WebhookSubscription = {
      id: `wh_${randomBytes(8).toString('hex')}`,
      organizationId,
      url,
      events: events && events.length > 0 ? events : DEFAULT_EVENTS,
      secret,
      secretLastFour: secret.slice(-4),
      status: 'active',
      createdAt: now,
      createdBy: actorId,
    };

    db.data.webhooks.push(webhook);
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'webhook.created',
      targetType: 'webhook',
      targetId: webhook.id,
      metadata: { url: webhook.url, events: webhook.events },
    });

    return webhook;
  }

  async remove(organizationId: string, actorId: string, webhookId: string): Promise<void> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const index = db.data.webhooks.findIndex(
      webhook => webhook.id === webhookId && webhook.organizationId === organizationId,
    );
    if (index === -1) {
      throw new Error('Webhook not found.');
    }
    const [webhook] = db.data.webhooks.splice(index, 1);
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'webhook.deleted',
      targetType: 'webhook',
      targetId: webhook.id,
      metadata: { url: webhook.url },
    });
  }

  async triggerTestDelivery(webhook: WebhookSubscription): Promise<{ delivered: boolean; status?: number }> {
    const payload = JSON.stringify({
      id: `evt_${randomBytes(6).toString('hex')}`,
      type: webhook.events[0] ?? 'chat.completed',
      createdAt: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Scribe AI.',
        organizationId: webhook.organizationId,
      },
    });

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Scribe-Signature': buildSignature(webhook.secret, payload),
        },
        body: payload,
      });
      webhook.lastDeliveredAt = new Date().toISOString();
      await db.write();
      return { delivered: response.ok, status: response.status };
    } catch (error) {
      webhook.lastFailureAt = new Date().toISOString();
      await db.write();
      return { delivered: false };
    }
  }

  async test(organizationId: string, actorId: string, webhookId: string) {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const webhook = db.data.webhooks.find(
      item => item.id === webhookId && item.organizationId === organizationId,
    );
    if (!webhook) {
      throw new Error('Webhook not found.');
    }

    const result = await this.triggerTestDelivery(webhook);

    await auditService.record({
      organizationId,
      actorId,
      action: 'webhook.test',
      targetType: 'webhook',
      targetId: webhook.id,
      metadata: { delivered: result.delivered, status: result.status },
    });

    return result;
  }
}

export const webhookService = new WebhookService();
