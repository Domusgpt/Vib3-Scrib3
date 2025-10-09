import { createHash, randomBytes } from 'crypto';
import { db } from '../../database/client';
import { ApiKey, ApiKeySummary, ApiKeyWithSecret, ApiScope } from '../../types';
import { auditService } from '../audit/audit.service';

const SECRET_PREFIX = 'sk_live_';

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
  }): Promise<ApiKeyWithSecret> {
    const { organizationId, actorId, name, scopes, expiresAt } = params;

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const rawSecret = SECRET_PREFIX + randomBytes(24).toString('hex');
    const hash = createHash('sha256').update(rawSecret).digest('hex');
    const now = new Date().toISOString();

    const key: ApiKey = {
      id: `key_${randomBytes(8).toString('hex')}`,
      organizationId,
      name,
      prefix: rawSecret.slice(0, 8),
      hashedSecret: hash,
      lastFour: rawSecret.slice(-4),
      scopes,
      createdAt: now,
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
