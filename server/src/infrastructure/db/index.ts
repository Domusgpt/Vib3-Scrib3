import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import type {
  License,
  StyleProfile,
  Subscription,
  SubscriptionPlan,
  UsageRecord,
  User,
} from '../../shared/types';

export interface DbSchema {
  users: User[];
  style_profiles: StyleProfile[];
  licenses: License[];
  subscriptions: Subscription[];
  usage: UsageRecord[];
  plans: SubscriptionPlan[];
  webhookSecrets: { id: string; secret: string; createdAt: string }[];
}

const defaultPlans: SubscriptionPlan[] = [
  {
    id: 'free',
    name: 'Starter',
    description: 'Perfect for individuals exploring their voice. Includes limited automations and integrations.',
    monthlyPrice: 0,
    includedMessages: 120,
    overagePrice: 0.5,
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'Unlimited profile training, premium AI access, and priority support for small teams.',
    monthlyPrice: 39,
    includedMessages: 2000,
    overagePrice: 0.08,
  },
  {
    id: 'scale',
    name: 'Scale',
    description: 'Enterprise-grade compliance, SSO, and dedicated success manager with flexible usage tiers.',
    monthlyPrice: 129,
    includedMessages: 10000,
    overagePrice: 0.04,
  },
];

const defaultData: DbSchema = {
  users: [],
  style_profiles: [],
  licenses: [],
  subscriptions: [],
  usage: [],
  plans: defaultPlans,
  webhookSecrets: [],
};

const dbPath = path.resolve(__dirname, '../../..', 'db.json');

const adapter = new JSONFile<DbSchema>(dbPath);
export const db = new Low<DbSchema>(adapter, defaultData);

let initialised = false;

export const initDb = async () => {
  if (!initialised) {
    await db.read();
    db.data ||= defaultData;
    if (!db.data?.plans?.length) {
      db.data.plans = defaultPlans;
    }
    await db.write();
    initialised = true;
  }
  return db;
};
