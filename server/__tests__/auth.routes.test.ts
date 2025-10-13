import express, { type Request, type Response, type NextFunction } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Invitation,
  License,
  Organization,
  OrganizationAuthPolicy,
  OrganizationSummary,
  Subscription,
  UsageSnapshot,
  User,
} from '../types';

vi.mock('passport', () => {
  const authenticate = () => (_req: Request, _res: Response, next: NextFunction) => next();
  return {
    default: { authenticate },
    authenticate,
  };
});

type DbMock = {
  read: ReturnType<typeof vi.fn>;
  write: ReturnType<typeof vi.fn>;
  data: { invitations: Invitation[] };
};

const dbMock = vi.hoisted(() => ({
  read: vi.fn(),
  write: vi.fn(),
  data: {
    invitations: [] as Invitation[],
  },
})) as DbMock;

vi.mock('../database/client', () => ({
  db: dbMock,
}));

vi.mock('../modules/organizations/organization.service', () => ({
  organizationService: {
    ensurePersonalWorkspace: vi.fn(),
    listSummariesForUser: vi.fn(),
  },
}));

vi.mock('../modules/billing/billing.service', () => ({
  billingService: {
    getUsageSnapshot: vi.fn(),
  },
}));

vi.mock('../modules/licenses/license.service', () => ({
  licenseService: {
    getLicenseForUser: vi.fn(),
  },
}));

import authRouter from '../modules/auth/auth.routes';
import { organizationService } from '../modules/organizations/organization.service';
import { billingService } from '../modules/billing/billing.service';
import { licenseService } from '../modules/licenses/license.service';

const createAuthPolicy = (userId: string): OrganizationAuthPolicy => ({
  enforcement: 'optional',
  allowedProviders: ['google', 'facebook'],
  updatedAt: new Date().toISOString(),
  updatedBy: userId,
});

const createOrganizationSummary = (userId: string, organizationId: string): OrganizationSummary => {
  const now = new Date().toISOString();
  const organization: Organization = {
    id: organizationId,
    name: "Owner's Workspace",
    slug: 'owners-workspace',
    type: 'personal',
    planId: 'scribe-pro',
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    billingEmail: 'owner@example.com',
    authPolicy: createAuthPolicy(userId),
  };
  return {
    organization,
    membership: {
      id: 'mem-1',
      organizationId,
      userId,
      role: 'owner',
      status: 'active',
      joinedAt: now,
    },
    seats: {
      used: 1,
      limit: 5,
    },
    subscription: {
      id: 'sub-1',
      userId,
      organizationId,
      planId: 'scribe-pro',
      status: 'active',
      startedAt: now,
      seats: 1,
    },
  };
};

const createUsageSnapshot = (organizationId: string): UsageSnapshot => ({
  organizationId,
  planId: 'scribe-pro',
  monthlyLimit: 1000,
  usedMessages: 150,
  remainingMessages: 850,
  cycleRenewsAt: new Date().toISOString(),
  seats: {
    used: 1,
    limit: 5,
  },
});

describe('GET /auth/user', () => {
  const user: User = {
    id: 'user-1',
    email: 'owner@example.com',
    name: 'Owner Example',
  };

  const createApp = (seedUser: User | undefined) => {
    const app = express();
    app.use((req, _res, next) => {
      if (seedUser) {
        Object.assign(req, { user: seedUser, session: {} });
      }
      next();
    });
    app.use('/auth', authRouter);
    return app;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    dbMock.data.invitations = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns a hydrated session snapshot for authenticated users', async () => {
    const summary = createOrganizationSummary(user.id, 'org-1');
    const license: License = {
      id: 'license-1',
      userId: user.id,
      organizationId: summary.organization.id,
      status: 'active',
      planId: 'scribe-pro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const usage = createUsageSnapshot(summary.organization.id);

    const ensureWorkspace = organizationService.ensurePersonalWorkspace as unknown as ReturnType<typeof vi.fn>;
    const listSummaries = organizationService.listSummariesForUser as unknown as ReturnType<typeof vi.fn>;
    const getLicense = licenseService.getLicenseForUser as unknown as ReturnType<typeof vi.fn>;
    const getUsage = billingService.getUsageSnapshot as unknown as ReturnType<typeof vi.fn>;

    ensureWorkspace.mockResolvedValue(summary.organization);
    listSummaries.mockResolvedValue([summary]);
    getLicense.mockResolvedValue(license);
    getUsage.mockResolvedValue(usage);

    const pendingInvitation: Invitation = {
      id: 'inv-1',
      organizationId: 'org-2',
      email: 'owner@example.com',
      role: 'viewer',
      token: 'token',
      inviterId: 'user-2',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    const resolvedInvitation: Invitation = {
      ...pendingInvitation,
      id: 'inv-2',
      status: 'accepted',
    };
    dbMock.data.invitations = [pendingInvitation, resolvedInvitation];

    const app = createApp(user);
    const response = await request(app).get('/auth/user');

    expect(response.status).toBe(200);
    expect(response.body.isAuthenticated).toBe(true);
    expect(response.body.user).toMatchObject({ id: user.id, email: user.email });
    expect(response.body.activeOrganizationId).toBe(summary.organization.id);
    expect(response.body.subscription).toEqual(summary.subscription);
    expect(response.body.usage).toEqual(usage);
    expect(response.body.organizations).toHaveLength(1);
    expect(response.body.invitations).toEqual([pendingInvitation]);

    expect(ensureWorkspace).toHaveBeenCalledWith(user);
    expect(listSummaries).toHaveBeenCalledWith(user.id);
    expect(getLicense).toHaveBeenCalledWith(user.id, summary.organization.id);
    expect(getUsage).toHaveBeenCalledWith(user.id, summary.organization.id);
    expect(dbMock.read).toHaveBeenCalledTimes(1);
  });

  it('returns 401 when no session is present', async () => {
    const app = createApp(undefined);
    const response = await request(app).get('/auth/user');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      isAuthenticated: false,
      user: null,
      license: null,
      subscription: null,
      usage: null,
    });
  });
});
