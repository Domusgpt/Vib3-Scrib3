import { db } from '../database/db';
import { License, User } from '../../../types';

const nowIso = () => new Date().toISOString();

export async function findUserById(id: string): Promise<User | undefined> {
  await db.read();
  return db.data?.users.find((user) => user.id === id);
}

export async function upsertUser(user: User): Promise<User> {
  await db.read();
  const existingIndex = db.data?.users.findIndex((u) => u.id === user.id) ?? -1;
  if (existingIndex >= 0 && db.data) {
    db.data.users[existingIndex] = { ...db.data.users[existingIndex], ...user };
  } else {
    db.data?.users.push(user);
  }
  await db.write();
  return user;
}

export async function ensureLicense(userId: string): Promise<License> {
  await db.read();
  let license = db.data?.licenses.find((l) => l.userId === userId);

  if (!license) {
    license = {
      id: `license_${userId}`,
      userId,
      status: 'active',
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    db.data?.licenses.push(license);
    await db.write();
  }

  return license;
}
