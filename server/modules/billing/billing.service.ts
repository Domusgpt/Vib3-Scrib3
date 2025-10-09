import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { licenseService } from '../licenses/license.service';
import { BillingPlan, Subscription, UsageRecord, UsageSnapshot } from '../../types';
import { logger } from '../../lib/logger';
import { organizationService } from '../organizations/organization.service';

const DEFAULT_TRIAL_DAYS = 14;

class BillingService {
  async getPlans(): Promise<BillingPlan[]> {
    await db.read();
    return db.data?.billingPlans ?? [];
  }

  async getPlan(planId: string): Promise<BillingPlan | undefined> {
    const plans = await this.getPlans();
    return plans.find(plan => plan.id === planId);
  }

  async getSubscriptionForUser(userId: string): Promise<Subscription | null> {
    await db.read();
    const subscription = db.data?.subscriptions
      .filter(sub => sub.userId === userId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
    return subscription ?? null;
  }

  async getSubscriptionForOrganization(organizationId: string): Promise<Subscription | null> {
    await db.read();
    const subscription = db.data?.subscriptions
      .filter(sub => sub.organizationId === organizationId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
    return subscription ?? null;
  }

  async startTrial(
    userId: string,
    planId: string,
    organizationId?: string,
  ): Promise<{ subscription: Subscription; licenseStatus: string }> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const targetOrganizationId = organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));
    const existing = targetOrganizationId
      ? await this.getSubscriptionForOrganization(targetOrganizationId)
      : await this.getSubscriptionForUser(userId);
    if (existing && existing.status !== 'canceled') {
      throw new Error('An active subscription already exists for this user.');
    }

    const now = new Date();
    const trialDuration = plan.trialDays ?? DEFAULT_TRIAL_DAYS;
    const trialEnds = new Date(now);
    trialEnds.setDate(now.getDate() + trialDuration);

    const subscription: Subscription = {
      id: `sub_${randomUUID()}`,
      userId,
      planId,
      status: 'trialing',
      startedAt: now.toISOString(),
      renewsAt: this.getNextBillingDate(now).toISOString(),
      seats: 1,
      trialEndsAt: trialEnds.toISOString(),
      customerPortalUrl: `https://billing.scribe.ai/portal/${userId}`,
      organizationId: targetOrganizationId,
    };

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    db.data.subscriptions = db.data.subscriptions.filter(sub => sub.userId !== userId);
    db.data.subscriptions.push(subscription);
    await db.write();

    await licenseService.upsertLicense({
      userId,
      organizationId: targetOrganizationId,
      planId,
      status: 'active',
      trialEndsAt: subscription.trialEndsAt,
    });

    logger.info('Trial started', { userId, planId });
    return { subscription, licenseStatus: 'active' };
  }

  async createCheckoutSession(
    userId: string,
    planId: string,
    billingCadence: 'monthly' | 'yearly',
    organizationId?: string,
  ): Promise<{ checkoutUrl: string }> {
    const plan = await this.getPlan(planId);
    if (!plan) {
      throw new Error('Plan not found');
    }

    const baseParams = new URLSearchParams({
      plan: planId,
      cadence: billingCadence,
      user: userId,
    });
    if (organizationId) {
      baseParams.set('organization', organizationId);
    }
    const checkoutUrl = `https://billing.scribe.ai/checkout?${baseParams.toString()}`;
    return { checkoutUrl };
  }

  async getCustomerPortalUrl(userId: string, organizationId?: string): Promise<{ url: string }> {
    const targetOrganizationId = organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));
    const subscription = targetOrganizationId
      ? await this.getSubscriptionForOrganization(targetOrganizationId)
      : await this.getSubscriptionForUser(userId);
    if (!subscription?.customerPortalUrl) {
      const url = `https://billing.scribe.ai/portal/${targetOrganizationId ?? userId}`;
      return { url };
    }
    return { url: subscription.customerPortalUrl };
  }

  async getUsageSnapshot(userId: string, organizationId?: string): Promise<UsageSnapshot | null> {
    const targetOrganizationId =
      organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));
    const subscription = targetOrganizationId
      ? await this.getSubscriptionForOrganization(targetOrganizationId)
      : await this.getSubscriptionForUser(userId);
    const planId =
      subscription?.planId ??
      (await licenseService.getLicenseForUser(userId, targetOrganizationId))?.planId ??
      'scribe-free';
    const plan = await this.getPlan(planId);
    if (!plan) {
      return null;
    }
    const usage = targetOrganizationId
      ? await this.getCurrentUsageRecord(userId, targetOrganizationId)
      : await this.getCurrentUsageRecord(userId);
    const limit = plan.limits.monthlyMessages;
    const used = usage?.messageCount ?? 0;
    const remaining = limit === -1 ? 'unlimited' : Math.max(limit - used, 0);
    let seats: UsageSnapshot['seats'];
    if (targetOrganizationId && db.data) {
      const activeMembers = db.data.memberships.filter(
        member => member.organizationId === targetOrganizationId && member.status === 'active',
      ).length;
      const seatLimit = plan.limits.seats;
      seats = {
        used: activeMembers,
        limit: seatLimit === -1 ? 'unlimited' : seatLimit,
      };
    }
    return {
      organizationId: targetOrganizationId ?? usage?.organizationId ?? 'personal',
      planId,
      monthlyLimit: limit,
      usedMessages: used,
      remainingMessages: remaining,
      cycleRenewsAt: this.getNextBillingDate().toISOString(),
      seats,
    };
  }

  async recordMessageUsage(userId: string, tokens: number, organizationId?: string): Promise<void> {
    const targetOrganizationId =
      organizationId ?? (await organizationService.resolveActiveOrganizationId(userId));
    const usage = await this.getCurrentUsageRecord(userId, targetOrganizationId ?? undefined);
    const now = new Date().toISOString();
    if (!usage) {
      await this.createUsageRecord(userId, targetOrganizationId ?? userId, {
        messageCount: 1,
        tokenCount: tokens,
        lastMessageAt: now,
      });
      return;
    }

    usage.messageCount += 1;
    usage.tokenCount += tokens;
    usage.lastMessageAt = now;
    await db.write();
  }

  private async getCurrentUsageRecord(userId: string, organizationId?: string): Promise<UsageRecord | undefined> {
    await db.read();
    const month = this.getMonthKey();
    return db.data?.usage.find(
      record =>
        record.userId === userId &&
        record.month === month &&
        (organizationId ? record.organizationId === organizationId : true),
    );
  }

  private async createUsageRecord(
    userId: string,
    organizationId: string,
    data: Pick<UsageRecord, 'messageCount' | 'tokenCount' | 'lastMessageAt'>,
  ): Promise<void> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const record: UsageRecord = {
      id: `usage_${randomUUID()}`,
      userId,
      organizationId,
      month: this.getMonthKey(),
      messageCount: data.messageCount,
      tokenCount: data.tokenCount,
      lastMessageAt: data.lastMessageAt,
    };
    db.data.usage.push(record);
    await db.write();
  }

  private getMonthKey(date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

  private getNextBillingDate(from = new Date()): Date {
    return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  }
}

export const billingService = new BillingService();
