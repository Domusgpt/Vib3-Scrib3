import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { AuditLog } from '../../types';

class AuditService {
  async record(event: Omit<AuditLog, 'id' | 'createdAt'>): Promise<AuditLog> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const log: AuditLog = {
      id: `audit_${randomUUID()}`,
      createdAt: new Date().toISOString(),
      ...event,
    };
    db.data.auditLogs.push(log);
    await db.write();
    return log;
  }

  async list(organizationId: string, limit = 100): Promise<AuditLog[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    return db.data.auditLogs
      .filter(log => log.organizationId === organizationId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  async export(
    organizationId: string,
    options: { since?: string; limit?: number } = {},
  ): Promise<AuditLog[]> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const { since, limit } = options;
    const sinceTimestamp = since ? new Date(since).getTime() : undefined;
    return db.data.auditLogs
      .filter(log => {
        if (log.organizationId !== organizationId) {
          return false;
        }
        if (!sinceTimestamp) {
          return true;
        }
        const createdAt = new Date(log.createdAt).getTime();
        return !Number.isNaN(createdAt) && createdAt >= sinceTimestamp;
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(limit ? -Math.abs(limit) : undefined);
  }

  toCsv(logs: AuditLog[]): string {
    const header = ['id', 'createdAt', 'action', 'actorId', 'targetType', 'targetId', 'metadata'];
    const lines = logs.map(log => {
      const metadata = log.metadata ? JSON.stringify(log.metadata) : '';
      return [log.id, log.createdAt, log.action, log.actorId ?? '', log.targetType ?? '', log.targetId ?? '', metadata]
        .map(value => {
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',');
    });
    return [header.join(','), ...lines].join('\n');
  }
}

export const auditService = new AuditService();
