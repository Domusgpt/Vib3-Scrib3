import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { ProfileSourceType, StyleProfile } from '../../types';

interface CreateProfilePayload {
  userId: string;
  name: string;
  style?: string;
  source: ProfileSourceType;
}

class ProfileService {
  async list(userId: string): Promise<StyleProfile[]> {
    await db.read();
    const profiles = db.data?.style_profiles.filter(profile => profile.userId === userId) ?? [];
    return profiles.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async create(payload: CreateProfilePayload): Promise<StyleProfile> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const profile: StyleProfile = {
      id: `profile_${randomUUID()}`,
      userId: payload.userId,
      name: payload.name,
      style: payload.style ?? 'Style not yet analyzed.',
      source: payload.source,
      createdAt: new Date().toISOString(),
    };
    db.data.style_profiles.push(profile);
    await db.write();
    return profile;
  }
}

export const profileService = new ProfileService();
