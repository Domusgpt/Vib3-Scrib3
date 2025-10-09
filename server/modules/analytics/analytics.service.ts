import { db } from '../../database/client';
import { billingService } from '../billing/billing.service';
import { organizationService } from '../organizations/organization.service';
import {
  IncidentInsight,
  InsightCategory,
  InsightSeverity,
  InsightTrend,
  IntegrationName,
  ProfileSourceType,
  PulseRecommendation,
  UsageTrendPoint,
  WorkspacePulse,
} from '../../types';

const integrationCatalog: Array<{ name: IntegrationName; label: string; docsUrl: string }> = [
  { name: 'google', label: 'Gmail & Workspace', docsUrl: 'https://docs.vib3.ai/integrations/google-workspace' },
  { name: 'facebook', label: 'Facebook Pages', docsUrl: 'https://docs.vib3.ai/integrations/facebook' },
  { name: 'messages', label: 'SMS & WhatsApp', docsUrl: 'https://docs.vib3.ai/integrations/messages-beta' },
];

const previousPeriod = (current: string): string => {
  const [year, month] = current.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

const toMonthKey = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;

const severityFromAction = (action: string): InsightSeverity => {
  if (action.includes('past_due') || action.includes('suspended')) {
    return 'critical';
  }
  if (action.includes('failed') || action.includes('revoked') || action.includes('disconnected')) {
    return 'warning';
  }
  return 'info';
};

const categoryFromAction = (action: string): InsightCategory => {
  if (action.startsWith('billing')) return 'billing';
  if (action.startsWith('integration') || action.includes('webhook')) return 'integration';
  if (action.includes('automation') || action.includes('chat')) return 'automation';
  if (action.includes('security') || action.includes('license')) return 'security';
  return 'system';
};

const titleFromAction = (action: string): string => {
  switch (action) {
    case 'integration.connected':
      return 'Integration connected';
    case 'integration.disconnected':
      return 'Integration disconnected';
    case 'webhook.delivery.failed':
      return 'Webhook delivery failed';
    case 'billing.subscription.past_due':
      return 'Subscription requires attention';
    case 'organization.member.added':
      return 'New member joined';
    case 'organization.invite.sent':
      return 'Invitation issued';
    default:
      return action.replace(/\./g, ' ');
  }
};

const describeChange = (changePercent: number | null): string => {
  if (changePercent === null) return 'Tracking monthly throughput.';
  if (changePercent === 0) return 'Throughput is stable versus last month.';
  if (changePercent > 0) return `Up ${changePercent}% month over month.`;
  return `Down ${Math.abs(changePercent)}% month over month.`;
};

class AnalyticsService {
  async getWorkspacePulse(userId: string, organizationId?: string): Promise<WorkspacePulse> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const targetOrganizationId =
      organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));

    if (!targetOrganizationId) {
      throw new Error('No active workspace available.');
    }

    const organization = db.data.organizations.find(org => org.id === targetOrganizationId);
    if (!organization) {
      throw new Error('Workspace not found.');
    }

    const members = db.data.memberships
      .filter(member => member.organizationId === targetOrganizationId && member.status === 'active')
      .map(member => member.userId);

    const users = db.data.users.filter(user => members.includes(user.id));

    const styleProfiles = db.data.style_profiles.filter(profile => members.includes(profile.userId));

    const currentMonth = toMonthKey(new Date());
    const usageRecords = db.data.usage.filter(record => record.organizationId === targetOrganizationId);
    const currentUsage = usageRecords.find(record => record.month === currentMonth);

    const previousUsage = (() => {
      let cursor = previousPeriod(currentMonth);
      for (let i = 0; i < 6; i += 1) {
        const record = usageRecords.find(item => item.month === cursor);
        if (record) return record;
        cursor = previousPeriod(cursor);
      }
      return null;
    })();

    const plan = await billingService.getPlan(organization.planId);
    const messageLimit = plan?.limits.monthlyMessages ?? 0;
    const limitNormalized = messageLimit === -1 ? 'unlimited' : messageLimit;

    const connectedBreakdown = integrationCatalog.map(entry => {
      const connectedUser = users.find(user => {
        if (entry.name === 'google') return Boolean(user.google);
        if (entry.name === 'facebook') return Boolean(user.facebook);
        return false;
      });
      const lastSyncAt = currentUsage?.lastMessageAt ?? null;
      return {
        name: entry.name,
        connected: Boolean(connectedUser),
        lastSyncAt,
      };
    });

    const connectedCount = connectedBreakdown.filter(item => item.connected).length;
    const profileSources = new Set<ProfileSourceType>(styleProfiles.map(profile => profile.source));

    const totalProfiles = styleProfiles.length;
    const missingSources = (['text', 'gmail', 'facebook'] as ProfileSourceType[]).filter(
      source => !profileSources.has(source),
    );

    const currentMessages = currentUsage?.messageCount ?? 0;
    const previousMessages = previousUsage?.messageCount ?? null;

    const changePercent = previousMessages === null
      ? null
      : previousMessages === 0
      ? (currentMessages > 0 ? 100 : 0)
      : Math.round(((currentMessages - previousMessages) / previousMessages) * 100);

    const limitNumber = typeof limitNormalized === 'number' ? limitNormalized : null;
    const usageRatio = limitNumber && limitNumber > 0 ? Math.min(currentMessages / limitNumber, 1) : 1;
    const previousUsageRatio =
      previousMessages !== null && limitNumber && limitNumber > 0
        ? Math.min(previousMessages / limitNumber, 1)
        : usageRatio;

    const sourceDiversity = 3 - missingSources.length;

    const integrationDenominator = connectedBreakdown.length === 0 ? 1 : connectedBreakdown.length;
    const integrationRatio = connectedCount / integrationDenominator;

    const automationScore = Math.round(
      integrationRatio * 40 + usageRatio * 30 + (sourceDiversity / 3) * 30,
    );

    const previousAutomationScore = Math.round(
      integrationRatio * 40 + previousUsageRatio * 30 + (sourceDiversity / 3) * 30,
    );

    let trend: InsightTrend = 'steady';
    if (automationScore > previousAutomationScore) {
      trend = 'up';
    } else if (automationScore < previousAutomationScore) {
      trend = 'down';
    }

    const recommendations: PulseRecommendation[] = [];

    if (connectedCount < connectedBreakdown.length) {
      const missing = connectedBreakdown
        .filter(item => !item.connected)
        .map(item => integrationCatalog.find(entry => entry.name === item.name)?.label ?? item.name);
      recommendations.push({
        id: 'connect-integrations',
        title: 'Connect remaining channels',
        description: `Link ${missing.join(', ')} to expand Scribe\'s training corpus.`,
        actionLabel: 'Open integrations',
        actionUrl: '/integrations',
        priority: 'medium',
      });
    }

    if (limitNumber && usageRatio >= 0.8) {
      recommendations.push({
        id: 'plan-upgrade',
        title: 'Approaching message limit',
        description: 'You have used over 80% of the monthly allocation. Consider upgrading to avoid throttling.',
        actionLabel: 'Review plans',
        actionUrl: '/workspace',
        priority: 'high',
      });
    }

    if (missingSources.length > 0) {
      recommendations.push({
        id: 'diversify-profiles',
        title: 'Diversify training sources',
        description: 'Create additional style profiles from Gmail, Facebook, or manual uploads to improve tone coverage.',
        actionLabel: 'Go to workspace',
        actionUrl: '/workspace',
        priority: 'medium',
      });
    }

    if (automationScore < 70) {
      recommendations.push({
        id: 'boost-automation',
        title: 'Boost automation confidence',
        description: 'Automation quality is below target. Ensure connectors are synced and refresh profile training.',
        actionLabel: 'View playbook',
        actionUrl: '/integrations',
        priority: 'medium',
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        id: 'all-clear',
        title: 'Systems optimal',
        description: 'All signals look healthy. Keep an eye on usage to maintain performance.',
        priority: 'low',
      });
    }

    return {
      organizationId: organization.id,
      organizationName: organization.name,
      generatedAt: new Date().toISOString(),
      billingPlan: {
        id: plan?.id ?? organization.planId,
        name: plan?.name ?? organization.planId,
        messageLimit: limitNormalized,
      },
      messageVelocity: {
        current: currentMessages,
        previous: previousMessages,
        changePercent,
        limit: limitNormalized,
      },
      automationQuality: {
        score: automationScore,
        trend,
        note: describeChange(changePercent),
      },
      integrationCoverage: {
        connected: connectedCount,
        total: connectedBreakdown.length,
        breakdown: connectedBreakdown,
      },
      profileCoverage: {
        totalProfiles,
        activeProfiles: totalProfiles,
        missingSources,
      },
      recommendations,
    };
  }

  async getUsageTrend(userId: string, organizationId?: string, months = 6): Promise<UsageTrendPoint[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const targetOrganizationId =
      organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));

    if (!targetOrganizationId) {
      return [];
    }

    const records = db.data.usage.filter(record => record.organizationId === targetOrganizationId);
    const now = new Date();
    const periods: string[] = [];
    const cursor = new Date(now);
    for (let i = months - 1; i >= 0; i -= 1) {
      const date = new Date(cursor);
      date.setMonth(now.getMonth() - i);
      periods.push(toMonthKey(date));
    }

    return periods.map(period => {
      const periodRecords = records.filter(record => record.month === period);
      const messages = periodRecords.reduce((total, record) => total + record.messageCount, 0);
      const tokens = periodRecords.reduce((total, record) => total + record.tokenCount, 0);
      return { period, messages, tokens };
    });
  }

  async getIncidentFeed(userId: string, organizationId?: string, limit = 8): Promise<IncidentInsight[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const targetOrganizationId =
      organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));

    if (!targetOrganizationId) {
      return [
        {
          id: 'no-workspace',
          timestamp: new Date().toISOString(),
          title: 'No workspace selected',
          description: 'Choose or create a workspace to see operational insights.',
          severity: 'info',
          category: 'system',
        },
      ];
    }

    const logs = db.data.auditLogs
      .filter(log => log.organizationId === targetOrganizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    if (logs.length === 0) {
      return [
        {
          id: 'quiet-period',
          timestamp: new Date().toISOString(),
          title: 'No incidents detected',
          description: 'We have not recorded any noteworthy events in the past 30 days.',
          severity: 'info',
          category: 'system',
        },
      ];
    }

    return logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      title: titleFromAction(log.action),
      description: log.metadata?.message
        ? String(log.metadata.message)
        : `Actor ${log.actorId ?? 'system'} performed ${log.action}.`,
      severity: severityFromAction(log.action),
      category: categoryFromAction(log.action),
      relatedId: log.targetId,
    }));
  }
}

export const analyticsService = new AnalyticsService();
