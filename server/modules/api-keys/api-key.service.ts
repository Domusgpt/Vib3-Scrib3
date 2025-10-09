import { createHash, randomBytes } from 'crypto';
import { db } from '../../database/client';
import { ApiKey, ApiKeySummary, ApiKeyWithSecret, ApiScope } from '../../types';
import { auditService } from '../audit/audit.service';
import { alertService } from '../alerts/alert.service';

const SECRET_PREFIX = 'sk_live_';
const API_KEY_RATE_LIMIT_PER_HOUR = 5;
const API_KEY_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const API_KEY_ANOMALY_THRESHOLD = Math.max(1, Math.floor(API_KEY_RATE_LIMIT_PER_HOUR * 0.6));

const toSummary = (key: ApiKey): ApiKeySummary => ({
  id: key.id,
  organizationId: key.organizationId,
  name: key.name,
  prefix: key.prefix,
  lastFour: key.lastFour,
  scopes: key.scopes,
  createdAt: key.createdAt,
  createdBy: key.createdBy,
  expiresAt: key.expiresAt,
  revokedAt: key.revokedAt,
  lastUsedAt: key.lastUsedAt,
});

class ApiKeyService {
  async list(organizationId: string): Promise<ApiKeySummary[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return db.data.apiKeys
      .filter(key => key.organizationId === organizationId)
      .map(toSummary)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(params: {
    organizationId: string;
    actorId: string;
    name: string;
    scopes: ApiScope[];
    expiresAt?: string;
    actorEmail?: string;
    overrideRateLimit?: boolean;
  }): Promise<ApiKeyWithSecret> {
    const { organizationId, actorId, name, scopes, expiresAt, actorEmail, overrideRateLimit = false } = params;

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const organization = db.data.organizations.find(item => item.id === organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const now = new Date();
    const windowStart = now.getTime() - API_KEY_RATE_LIMIT_WINDOW_MS;
    const keysInWindow = db.data.apiKeys.filter(key => {
      if (key.organizationId !== organizationId) {
        return false;
      }
      const createdAt = new Date(key.createdAt).getTime();
      return createdAt >= windowStart;
    }).length;

    if (keysInWindow >= API_KEY_RATE_LIMIT_PER_HOUR) {
      if (!this.hasRecentAuditEvent(organizationId, 'api_key.rate_limited', API_KEY_RATE_LIMIT_WINDOW_MS)) {
        await auditService.record({
          organizationId,
          actorId,
          action: 'api_key.rate_limited',
          targetType: 'organization',
          metadata: {
            keysInWindow,
            limit: API_KEY_RATE_LIMIT_PER_HOUR,
            windowMinutes: Math.floor(API_KEY_RATE_LIMIT_WINDOW_MS / (60 * 1000)),
          },
        });
      }
      await alertService.notifyGovernanceLimit({
        organizationId,
        organizationName: organization.name,
        actorId,
        actorEmail,
        limitType: 'api_key',
        count: keysInWindow,
        limit: API_KEY_RATE_LIMIT_PER_HOUR,
        windowMinutes: Math.floor(API_KEY_RATE_LIMIT_WINDOW_MS / (60 * 1000)),
        override: overrideRateLimit,
      });
      if (!overrideRateLimit) {
        throw new Error('API key creation rate limit reached. Try again in a few minutes.');
      }
      await auditService.record({
        organizationId,
        actorId,
        action: 'api_key.rate_limit_overridden',
        targetType: 'organization',
        metadata: {
          keysInWindow,
          limit: API_KEY_RATE_LIMIT_PER_HOUR,
          windowMinutes: Math.floor(API_KEY_RATE_LIMIT_WINDOW_MS / (60 * 1000)),
        },
      });
    }

    if (
      keysInWindow >= API_KEY_ANOMALY_THRESHOLD &&
      !this.hasRecentAuditEvent(organizationId, 'api_key.anomaly_detected', API_KEY_RATE_LIMIT_WINDOW_MS)
    ) {
      await auditService.record({
        organizationId,
        actorId,
        action: 'api_key.anomaly_detected',
        targetType: 'organization',
        metadata: {
          keysInWindow,
          limit: API_KEY_RATE_LIMIT_PER_HOUR,
          windowMinutes: Math.floor(API_KEY_RATE_LIMIT_WINDOW_MS / (60 * 1000)),
        },
      });
    }

    const rawSecret = SECRET_PREFIX + randomBytes(24).toString('hex');
    const hash = createHash('sha256').update(rawSecret).digest('hex');
    const nowIso = now.toISOString();

    const key: ApiKey = {
      id: `key_${randomBytes(8).toString('hex')}`,
      organizationId,
      name,
      prefix: rawSecret.slice(0, 8),
      hashedSecret: hash,
      lastFour: rawSecret.slice(-4),
      scopes,
      createdAt: nowIso,
      createdBy: actorId,
      expiresAt,
    };

    db.data.apiKeys.push(key);
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'api_key.created',
      targetType: 'api_key',
      targetId: key.id,
      metadata: { name, scopes },
    });

    return { key: toSummary(key), secret: rawSecret };
  }

  private hasRecentAuditEvent(organizationId: string, action: string, windowMs: number): boolean {
    if (!db.data) {
      return false;
    }
    const cutoff = Date.now() - windowMs;
    return db.data.auditLogs.some(
      log => log.organizationId === organizationId && log.action === action && new Date(log.createdAt).getTime() >= cutoff,
    );
  }

  async revoke(organizationId: string, actorId: string, keyId: string): Promise<ApiKeySummary> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const key = db.data.apiKeys.find(item => item.id === keyId && item.organizationId === organizationId);
    if (!key) {
      throw new Error('API key not found.');
    }

    key.revokedAt = new Date().toISOString();
    await db.write();

    await auditService.record({
      organizationId,
      actorId,
      action: 'api_key.revoked',
      targetType: 'api_key',
      targetId: key.id,
      metadata: { name: key.name },
    });

    return toSummary(key);
  }

  async touchUsage(keyId: string): Promise<void> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const key = db.data.apiKeys.find(item => item.id === keyId);
    if (key) {
      key.lastUsedAt = new Date().toISOString();
      await db.write();
    }
  }
}

export const apiKeyService = new ApiKeyService();
