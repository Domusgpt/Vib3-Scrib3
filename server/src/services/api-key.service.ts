import crypto from 'crypto';

import { db } from '../database/db';
import { ApiKey } from '../../../types';

const nowIso = () => new Date().toISOString();

export interface ApiKeyWithSecret {
  key: ApiKey;
  secret: string;
}

function hashSecret(secret: string) {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

export async function listApiKeys(tenantId: string): Promise<ApiKey[]> {
  await db.read();
  return (db.data?.apiKeys || []).filter((key) => key.tenantId === tenantId);
}

export async function createApiKey(tenantId: string, label: string): Promise<ApiKeyWithSecret> {
  await db.read();
  const rawSecret = `sk_${crypto.randomBytes(24).toString('hex')}`;
  const key: ApiKey = {
    id: `key_${crypto.randomUUID()}`,
    tenantId,
    label,
    preview: `${rawSecret.slice(0, 4)}...${rawSecret.slice(-4)}`,
    hashedKey: hashSecret(rawSecret),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.data?.apiKeys.push(key);
  await db.write();

  return { key, secret: rawSecret };
}

export async function revokeApiKey(tenantId: string, keyId: string): Promise<void> {
  await db.read();
  const keys = db.data?.apiKeys || [];
  const index = keys.findIndex((key) => key.tenantId === tenantId && key.id === keyId);

  if (index !== -1) {
    keys.splice(index, 1);
    await db.write();
  }
}
