import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { License } from '../../types';

class LicenseService {
  async getLicenseForContext(userId: string, organizationId?: string): Promise<License | null> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return (
      db.data.licenses.find(
        license =>
          license.userId === userId &&
          (organizationId ? license.organizationId === organizationId : !license.organizationId),
      ) ?? null
    );
  }

  async getLicenseForUser(userId: string, organizationId?: string): Promise<License | null> {
    return this.getLicenseForContext(userId, organizationId);
  }

  async upsertLicense(params: {
    userId: string;
    organizationId?: string;
    planId: string;
    status: License['status'];
    trialEndsAt?: string;
  }): Promise<License> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const existing = db.data.licenses.find(
      license =>
        license.userId === params.userId &&
        (params.organizationId ? license.organizationId === params.organizationId : !license.organizationId),
    );

    const now = new Date().toISOString();
    if (existing) {
      existing.status = params.status;
      existing.planId = params.planId;
      existing.trialEndsAt = params.trialEndsAt;
      existing.updatedAt = now;
      existing.organizationId = params.organizationId;
      await db.write();
      return existing;
    }

    const license: License = {
      id: `license_${randomUUID()}`,
      userId: params.userId,
      organizationId: params.organizationId,
      status: params.status,
      planId: params.planId,
      trialEndsAt: params.trialEndsAt,
      createdAt: now,
      updatedAt: now,
    };

    db.data.licenses.push(license);
    await db.write();
    return license;
  }
}

export const licenseService = new LicenseService();
