import { env } from '../../config/env';

type GovernanceLimitType = 'invitation' | 'api_key';

interface GovernanceAlertPayload {
  organizationId: string;
  organizationName?: string;
  actorId: string;
  actorEmail?: string;
  limitType: GovernanceLimitType;
  count: number;
  limit: number;
  windowMinutes: number;
  override?: boolean;
}

const limitLabels: Record<GovernanceLimitType, string> = {
  invitation: 'invitation issuance',
  api_key: 'API key creation',
};

class AlertService {
  private slackWebhookUrl = env.SLACK_WEBHOOK_URL;
  private pagerDutyRoutingKey = env.PAGERDUTY_ROUTING_KEY;

  async notifyGovernanceLimit(payload: GovernanceAlertPayload): Promise<void> {
    const notifications: Array<Promise<unknown>> = [];
    if (!this.slackWebhookUrl && !this.pagerDutyRoutingKey) {
      return;
    }

    const summary = this.buildSummary(payload);

    if (this.slackWebhookUrl) {
      notifications.push(
        this.sendSlackNotification({
          text: summary,
        }),
      );
    }

    if (this.pagerDutyRoutingKey) {
      notifications.push(this.sendPagerDutyEvent(payload, summary));
    }

    if (notifications.length > 0) {
      await Promise.allSettled(notifications);
    }
  }

  private buildSummary(payload: GovernanceAlertPayload): string {
    const { organizationId, organizationName, actorId, actorEmail, limitType, count, limit, windowMinutes, override } = payload;
    const orgLabel = organizationName ? `${organizationName} (${organizationId})` : organizationId;
    const actorLabel = actorEmail ? `${actorEmail} (${actorId})` : actorId;
    const limitLabel = limitLabels[limitType];
    const prefix = override ? 'Rate limit override requested' : 'Governance limit reached';
    return `${prefix}: ${limitLabel} for ${orgLabel} hit ${count}/${limit} in ${windowMinutes}m by ${actorLabel}.`;
  }

  private async sendSlackNotification(body: { text: string }): Promise<void> {
    if (!this.slackWebhookUrl) {
      return;
    }

    try {
      await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body.text }),
      });
    } catch (error) {
      console.error('Failed to send Slack alert', error);
    }
  }

  private async sendPagerDutyEvent(payload: GovernanceAlertPayload, summary: string): Promise<void> {
    if (!this.pagerDutyRoutingKey) {
      return;
    }

    try {
      await fetch('https://events.pagerduty.com/v2/enqueue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          routing_key: this.pagerDutyRoutingKey,
          event_action: 'trigger',
          payload: {
            summary,
            severity: payload.override ? 'warning' : 'error',
            source: 'scribe-governance',
            component: payload.limitType,
            group: payload.organizationId,
            custom_details: payload,
          },
        }),
      });
    } catch (error) {
      console.error('Failed to send PagerDuty alert', error);
    }
  }
}

export const alertService = new AlertService();

