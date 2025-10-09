import { db } from '../database/db';
import { UsageRecord } from '../../../types';

export interface UsageSnapshot {
  currentPeriod: UsageRecord;
  previousPeriod?: UsageRecord;
}

const nowIso = () => new Date().toISOString();

function defaultUsage(tenantId: string): UsageRecord {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return {
    id: `usage_${tenantId}_${periodStart.toISOString()}`,
    tenantId,
    periodStart: periodStart.toISOString(),
    periodEnd: nextPeriod.toISOString(),
    messages: 0,
    profilesGenerated: 0,
    automationsTriggered: 0,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export async function getUsageSnapshot(tenantId: string): Promise<UsageSnapshot> {
  await db.read();
  const usage = db.data?.usage || [];
  let current = usage.find((record) => record.tenantId === tenantId);

  if (!current) {
    current = defaultUsage(tenantId);
    usage.push(current);
    await db.write();
  }

  return {
    currentPeriod: current,
  };
}

export async function incrementUsage(
  tenantId: string,
  delta: Partial<Pick<UsageRecord, 'messages' | 'profilesGenerated' | 'automationsTriggered'>>
): Promise<void> {
  await db.read();
  const usage = db.data?.usage || [];
  let current = usage.find((record) => record.tenantId === tenantId);

  if (!current) {
    current = defaultUsage(tenantId);
    usage.push(current);
  }

  current.messages += delta.messages ?? 0;
  current.profilesGenerated += delta.profilesGenerated ?? 0;
  current.automationsTriggered += delta.automationsTriggered ?? 0;
  current.updatedAt = nowIso();

  await db.write();
}
