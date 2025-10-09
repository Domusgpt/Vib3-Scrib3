import crypto from 'crypto';

import { subscriptionPlans } from '../config/plans';
import { db } from '../database/db';
import { Subscription, SubscriptionPlan, SubscriptionStatus, Tenant } from '../../../types';

const nowIso = () => new Date().toISOString();

export function getPlanById(planId: string): SubscriptionPlan | undefined {
  return subscriptionPlans.find((plan) => plan.id === planId);
}

export async function getSubscriptionForTenant(tenantId: string): Promise<Subscription | undefined> {
  await db.read();
  return db.data?.subscriptions.find((sub) => sub.tenantId === tenantId);
}

export async function ensureTrialSubscription(tenant: Tenant): Promise<Subscription> {
  await db.read();
  let subscription = db.data?.subscriptions.find((sub) => sub.tenantId === tenant.id);

  if (!subscription) {
    const plan = subscriptionPlans[0];
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + plan.trialDays);

    subscription = {
      id: `sub_${crypto.randomUUID()}`,
      tenantId: tenant.id,
      planId: plan.id,
      status: 'trialing',
      renewsAt: trialEndsAt.toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    db.data?.subscriptions.push(subscription);
    await db.write();
  }

  return subscription;
}

export async function updateSubscriptionPlan(
  tenantId: string,
  planId: string,
  status: SubscriptionStatus = 'active'
): Promise<Subscription> {
  await db.read();
  const subscription = db.data?.subscriptions.find((sub) => sub.tenantId === tenantId);

  const renewsAt = new Date();
  renewsAt.setMonth(renewsAt.getMonth() + 1);

  if (subscription) {
    subscription.planId = planId;
    subscription.status = status;
    subscription.renewsAt = renewsAt.toISOString();
    subscription.updatedAt = nowIso();
  } else {
    db.data?.subscriptions.push({
      id: `sub_${crypto.randomUUID()}`,
      tenantId,
      planId,
      status,
      renewsAt: renewsAt.toISOString(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }

  await db.write();
  const stored = db.data?.subscriptions.find((sub) => sub.tenantId === tenantId);
  if (!stored) {
    throw new Error('Failed to persist subscription.');
  }
  return stored;
}

export function getPlanCatalog(): SubscriptionPlan[] {
  return subscriptionPlans;
}
