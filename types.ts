export enum MessageAuthor {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system',
}

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
}

export interface FunctionResponse {
  name: string;
  response: Record<string, any>;
}

export interface ChatMessage {
  author: MessageAuthor;
  text?: string;
  functionCall?: FunctionCall;
  functionResponse?: FunctionResponse;
}

export enum LLMProvider {
  GEMINI = 'gemini',
  OPENAI = 'openai',
  GROK = 'grok',
}

export type IntegrationName = 'google' | 'facebook' | 'slack' | 'salesforce';

export interface Integration {
  name: IntegrationName;
  connected: boolean;
}

export type ProfileSourceType = 'text' | 'gmail' | 'facebook';

export interface ProfileSource {
  type: ProfileSourceType;
  content?: string;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  google?: {
    id: string;
    accessToken: string;
  };
  facebook?: {
    id: string;
    accessToken: string;
  };
}

export interface StyleProfile {
  id: string;
  userId: string;
  name: string;
  style: string;
  source: ProfileSourceType;
  createdAt: string;
}

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled';

export interface SubscriptionPlanLimits {
  monthlyMessages: number;
  profiles: number;
  connectors: number;
  automations: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  trialDays: number;
  seatsIncluded: number;
  features: string[];
  limits: SubscriptionPlanLimits;
}

export interface Tenant {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: SubscriptionStatus;
  renewsAt: string;
  cancelAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface License {
  id: string;
  userId: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationDescriptor {
  id: string;
  name: string;
  description: string;
  category: 'email' | 'messaging' | 'crm' | 'automation';
  scopes: string[];
  documentationUrl: string;
  status: 'stable' | 'beta' | 'coming_soon';
}

export interface IntegrationConnection {
  id: string;
  tenantId: string;
  provider: string;
  status: 'connected' | 'revoked' | 'error';
  scopes: string[];
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string | null;
}

export interface ApiKey {
  id: string;
  tenantId: string;
  label: string;
  preview: string;
  hashedKey: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string | null;
}

export interface UsageRecord {
  id: string;
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  messages: number;
  profilesGenerated: number;
  automationsTriggered: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  license: License | null;
  tenant?: Tenant | null;
  subscription?: Subscription | null;
  baseUrl?: string;
}

export interface PlatformOverview {
  tenant: Tenant;
  subscription?: Subscription;
  usage: { currentPeriod: UsageRecord; previousPeriod?: UsageRecord };
  plans: SubscriptionPlan[];
  integrations: IntegrationConnection[];
  integrationCatalog: IntegrationDescriptor[];
  apiKeys: Omit<ApiKey, 'hashedKey'>[];
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      logout(callback: (err?: Error) => void): void;
      isAuthenticated(): boolean;
      tenant?: Tenant;
      subscription?: Subscription;
    }

    interface SessionData {
      activeProfileId?: string;
    }
  }
}
