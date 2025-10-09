import crypto from 'crypto';

import { db } from '../database/db';
import { StyleProfile, User } from '../../../types';

const nowIso = () => new Date().toISOString();

export async function listProfiles(userId: string): Promise<StyleProfile[]> {
  await db.read();
  return (db.data?.styleProfiles || [])
    .filter((profile) => profile.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function createProfile(user: User, name: string, source: StyleProfile['source'], style: string): Promise<StyleProfile> {
  await db.read();
  const profile: StyleProfile = {
    id: `profile_${crypto.randomUUID()}`,
    userId: user.id,
    name,
    source,
    style,
    createdAt: nowIso(),
  };

  db.data?.styleProfiles.push(profile);
  await db.write();

  return profile;
}
