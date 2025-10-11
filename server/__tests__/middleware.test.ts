import type { Request, Response, NextFunction } from 'express';
import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../modules/billing/billing.service', () => ({
  billingService: {
    getSubscriptionForUser: vi.fn(),
  },
}));

vi.mock('../modules/licenses/license.service', () => ({
  licenseService: {
    getLicenseForUser: vi.fn(),
  },
}));

import { isAuthenticated, hasActiveLicense } from '../middleware/index';
import { billingService } from '../modules/billing/billing.service';
import { licenseService } from '../modules/licenses/license.service';

const createResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
};

describe('isAuthenticated middleware', () => {
  it('allows the request when the session is authenticated', () => {
    const req = {
      isAuthenticated: () => true,
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    isAuthenticated(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects the request when the session is anonymous', () => {
    const req = {
      isAuthenticated: () => false,
    } as unknown as Request;
    const res = createResponse();
    const next = vi.fn();

    isAuthenticated(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('hasActiveLicense middleware', () => {
  const userId = 'user-123';

  const createRequest = (user?: { id: string }) =>
    ({
      user,
    } as unknown as Request);

  let res: Response;
  let next: NextFunction;

  beforeEach(() => {
    vi.resetAllMocks();
    res = createResponse();
    next = vi.fn();
  });

  it('allows requests when the user has an active license', async () => {
    const mockGetLicense = licenseService.getLicenseForUser as unknown as ReturnType<typeof vi.fn>;
    const mockGetSubscription = billingService.getSubscriptionForUser as unknown as ReturnType<typeof vi.fn>;

    mockGetLicense.mockResolvedValue({
      id: 'license-1',
      userId,
      status: 'active',
      planId: 'scribe-pro',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockGetSubscription.mockResolvedValue(null);

    await hasActiveLicense(createRequest({ id: userId }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows requests when an active or trialing subscription exists', async () => {
    const mockGetLicense = licenseService.getLicenseForUser as unknown as ReturnType<typeof vi.fn>;
    const mockGetSubscription = billingService.getSubscriptionForUser as unknown as ReturnType<typeof vi.fn>;

    mockGetLicense.mockResolvedValue(null);
    mockGetSubscription.mockResolvedValue({
      id: 'sub-1',
      userId,
      planId: 'scribe-pro',
      status: 'trialing',
      startedAt: new Date().toISOString(),
      seats: 1,
    });

    await hasActiveLicense(createRequest({ id: userId }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it('rejects requests without an authenticated user', async () => {
    await hasActiveLicense(createRequest(undefined), res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not authenticated' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests that lack both a license and subscription', async () => {
    const mockGetLicense = licenseService.getLicenseForUser as unknown as ReturnType<typeof vi.fn>;
    const mockGetSubscription = billingService.getSubscriptionForUser as unknown as ReturnType<typeof vi.fn>;

    mockGetLicense.mockResolvedValue(null);
    mockGetSubscription.mockResolvedValue(null);

    await hasActiveLicense(createRequest({ id: userId }), res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'An active license or subscription is required to use this feature.',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
