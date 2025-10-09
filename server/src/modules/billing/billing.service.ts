import { addMonths, parseISO } from 'date-fns';
import type {
  SubscriptionTier,
  Subscription,
  UsageRecord,
  SubscriptionPlan,
  User,
} from '../../shared/types';
import { db, initDb } from '../../infrastructure/db';

export const getPlans = async (): Promise<SubscriptionPlan[]> => {
  await initDb();
  return db.data.plans;
};

export const getSubscriptionForUser = async (userId: string): Promise<Subscription | null> => {
  await initDb();
  return db.data.subscriptions.find((sub) => sub.userId === userId) || null;
};

export const upsertSubscription = async (
  user: User,
  planId: SubscriptionTier,
  status: Subscription['status'] = 'active'
) => {
  await initDb();
  let subscription = db.data.subscriptions.find((sub) => sub.userId === user.id);
  if (!subscription) {
    subscription = {
      id: `sub_${Date.now()}`,
      userId: user.id,
      planId,
      status,
      startedAt: new Date().toISOString(),
    };
    db.data.subscriptions.push(subscription);
  } else {
    subscription.planId = planId;
    subscription.status = status;
    subscription.renewedAt = new Date().toISOString();
  }
  await db.write();
  return subscription;
};

const getUsageKey = (date = new Date()) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

export const getUsageForUser = async (userId: string, date = new Date()): Promise<UsageRecord> => {
  await initDb();
  const month = getUsageKey(date);
  let usage = db.data.usage.find((record) => record.userId === userId && record.month === month);
  if (!usage) {
    usage = {
      id: `usage_${Date.now()}`,
      userId,
      month,
      messagesUsed: 0,
      lastUpdated: new Date().toISOString(),
    };
    db.data.usage.push(usage);
    await db.write();
  }
  return usage;
};

export const incrementUsage = async (userId: string, count = 1) => {
  const usage = await getUsageForUser(userId);
  usage.messagesUsed += count;
  usage.lastUpdated = new Date().toISOString();
  await db.write();
  return usage;
};

export const getPlanAllowance = async (planId: SubscriptionTier) => {
  await initDb();
  return db.data.plans.find((plan) => plan.id === planId);
};

export const isUsageWithinAllowance = async (subscription: Subscription, usage: UsageRecord) => {
  const plan = await getPlanAllowance(subscription.planId);
  if (!plan) {
    return true;
  }
  return usage.messagesUsed <= plan.includedMessages;
};

export const scheduleRenewal = (subscription: Subscription) => {
  if (!subscription.renewedAt) {
    return parseISO(subscription.startedAt);
  }
  return addMonths(parseISO(subscription.renewedAt), 1);
};

