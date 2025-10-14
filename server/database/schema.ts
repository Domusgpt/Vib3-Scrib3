import {
  ApiKey,
  AuditLog,
  BillingPlan,
  ClaudeMemory,
  Invitation,
  License,
  Membership,
  Organization,
  PluginSignup,
  StyleProfile,
  Subscription,
  UsageRecord,
  User,
  WebhookSubscription,
} from '../types';

export interface DatabaseSchema {
  users: User[];
  style_profiles: StyleProfile[];
  licenses: License[];
  subscriptions: Subscription[];
  usage: UsageRecord[];
  billingPlans: BillingPlan[];
  organizations: Organization[];
  memberships: Membership[];
  invitations: Invitation[];
  apiKeys: ApiKey[];
  webhooks: WebhookSubscription[];
  auditLogs: AuditLog[];
  claudeMemories: ClaudeMemory[];
  pluginSignups: PluginSignup[];
}

export const createDefaultSchema = (): DatabaseSchema => ({
  users: [],
  style_profiles: [],
  licenses: [],
  subscriptions: [],
  usage: [],
  billingPlans: [],
  organizations: [],
  memberships: [],
  invitations: [],
  apiKeys: [],
  webhooks: [],
  auditLogs: [],
  claudeMemories: [],
  pluginSignups: [],
});
