import crypto from 'crypto';

import { integrationCatalog } from '../config/integrations';
import { db } from '../database/db';
import { IntegrationConnection, IntegrationDescriptor } from '../../../types';

const nowIso = () => new Date().toISOString();

export function getIntegrationCatalog(): IntegrationDescriptor[] {
  return integrationCatalog;
}

export async function listConnections(tenantId: string): Promise<IntegrationConnection[]> {
  await db.read();
  return (db.data?.integrationConnections || []).filter((conn) => conn.tenantId === tenantId);
}

export async function connectIntegration(
  tenantId: string,
  provider: string,
  scopes: string[]
): Promise<IntegrationConnection> {
  await db.read();
  const existing = db.data?.integrationConnections.find(
    (conn) => conn.tenantId === tenantId && conn.provider === provider
  );

  if (existing) {
    existing.status = 'connected';
    existing.scopes = scopes;
    existing.updatedAt = nowIso();
    await db.write();
    return existing;
  }

  const connection: IntegrationConnection = {
    id: `int_${crypto.randomUUID()}`,
    tenantId,
    provider,
    status: 'connected',
    scopes,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  db.data?.integrationConnections.push(connection);
  await db.write();
  return connection;
}

export async function disconnectIntegration(tenantId: string, provider: string): Promise<void> {
  await db.read();
  const connection = db.data?.integrationConnections.find(
    (conn) => conn.tenantId === tenantId && conn.provider === provider
  );

  if (connection) {
    connection.status = 'revoked';
    connection.updatedAt = nowIso();
    await db.write();
  }
}
