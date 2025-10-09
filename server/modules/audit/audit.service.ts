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
}

export const auditService = new AuditService();
