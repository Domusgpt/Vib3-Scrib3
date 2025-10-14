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

  async findById(userId: string, profileId: string): Promise<StyleProfile | null> {
    await db.read();
    const profile = db.data?.style_profiles.find(p => p.userId === userId && p.id === profileId) ?? null;
    return profile;
  }

  async resolveActive(
    userId: string,
    activeProfileId?: string | null,
  ): Promise<{ profile: StyleProfile | null; isFallback: boolean }> {
    const profiles = await this.list(userId);
    if (profiles.length === 0) {
      return { profile: null, isFallback: false };
    }

    if (activeProfileId) {
      const active = profiles.find(profile => profile.id === activeProfileId);
      if (active) {
        return { profile: active, isFallback: false };
      }
    }

    return { profile: profiles[0], isFallback: true };
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
