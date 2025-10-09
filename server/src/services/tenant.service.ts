import { db } from '../database/db';
import { Tenant, User } from '../../../types';

const nowIso = () => new Date().toISOString();

export async function ensureTenantForUser(user: User): Promise<Tenant> {
  await db.read();
  let tenant = db.data?.tenants.find((t) => t.ownerId === user.id);

  if (!tenant) {
    tenant = {
      id: `tenant_${Date.now()}`,
      name: user.name ? `${user.name.split(' ')[0]}'s Workspace` : 'My Workspace',
      ownerId: user.id,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.data?.tenants.push(tenant);
    await db.write();
  }

  return tenant;
}

export async function getTenantById(id: string): Promise<Tenant | undefined> {
  await db.read();
  return db.data?.tenants.find((t) => t.id === id);
}
