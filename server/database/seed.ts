import { db } from './client';
import { BillingPlan } from '../types';

const defaultPlans: BillingPlan[] = [
  {
    id: 'scribe-free',
    name: 'Free',
    description: 'Get started with Scribe AI and explore personal style training.',
    priceMonthly: 0,
    priceYearly: 0,
    pricePerSeat: 0,
    trialDays: 0,
    features: [
      '50 AI-authored messages per month',
      '1 connected integration',
      'Community support'
    ],
    limits: {
      monthlyMessages: 50,
      integrations: 1,
      seats: 1,
    },
    isPopular: false,
  },
  {
    id: 'scribe-pro',
    name: 'Pro',
    description: 'Unlock unlimited personal stylebooks, automations, and integrations.',
    priceMonthly: 39,
    priceYearly: 399,
    pricePerSeat: 19,
    trialDays: 14,
    features: [
      '2,000 AI-authored messages per month',
      'Unlimited style profiles',
      'Up to 5 integrations',
      'Priority support',
    ],
    limits: {
      monthlyMessages: 2000,
      integrations: 5,
      seats: 1,
    },
    isPopular: true,
  },
  {
    id: 'scribe-enterprise',
    name: 'Enterprise',
    description: 'Advanced governance, SSO, and custom integrations for teams.',
    priceMonthly: 129,
    priceYearly: 1290,
    pricePerSeat: 39,
    trialDays: 30,
    features: [
      'Unlimited AI-authored messages',
      'Team workspaces and approvals',
      'SOC2-ready audit trails',
      'Dedicated success manager'
    ],
    limits: {
      monthlyMessages: -1,
      integrations: -1,
      seats: 25,
    },
    isPopular: false,
  },
];

export const seedDatabase = async () => {
  if (!db.data) {
    throw new Error('Database not initialized');
  }

  if (!db.data.billingPlans || db.data.billingPlans.length === 0) {
    db.data.billingPlans = defaultPlans;
  }

  db.data.organizations ??= [];
  db.data.memberships ??= [];
  db.data.invitations ??= [];
  db.data.apiKeys ??= [];
  db.data.webhooks ??= [];
  db.data.auditLogs ??= [];

  await db.write();
};
