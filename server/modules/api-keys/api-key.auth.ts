import { createHash, timingSafeEqual } from 'crypto';
import { db } from '../../database/client';
import { ApiKey, ApiScope } from '../../types';
import { apiKeyService } from './api-key.service';

export interface VerifiedApiKey {
  key: ApiKey;
}

export const verifyApiKeySecret = async (
  secret: string,
  requiredScopes: ApiScope[] = [],
): Promise<VerifiedApiKey> => {
  if (!secret) {
    throw new Error('API key is required.');
  }

  const hashedSecret = createHash('sha256').update(secret).digest('hex');

  await db.read();
  if (!db.data) {
    throw new Error('Database not initialized');
  }

  let matchingKey: ApiKey | undefined;
  for (const candidate of db.data.apiKeys) {
    if (candidate.revokedAt) {
      continue;
    }
    if (candidate.expiresAt && new Date(candidate.expiresAt) < new Date()) {
      continue;
    }

    const candidateBuffer = Buffer.from(candidate.hashedSecret, 'hex');
    const providedBuffer = Buffer.from(hashedSecret, 'hex');
    if (candidateBuffer.length !== providedBuffer.length) {
      continue;
    }

    if (timingSafeEqual(candidateBuffer, providedBuffer)) {
      matchingKey = candidate;
      break;
    }
  }

  if (!matchingKey) {
    throw new Error('Invalid API key provided.');
  }

  if (requiredScopes.length > 0) {
    const missing = requiredScopes.filter(scope => !matchingKey!.scopes.includes(scope));
    if (missing.length > 0) {
      throw new Error(`API key is missing required scopes: ${missing.join(', ')}`);
    }
  }

  await apiKeyService.touchUsage(matchingKey.id);

  return { key: matchingKey };
};
