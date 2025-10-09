import { randomUUID } from 'crypto';
import { Profile } from 'passport';
import { db } from '../../database/client';
import { User } from '../../types';
import { organizationService } from '../organizations/organization.service';

export type OAuthProvider = 'google' | 'facebook';

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
}

class UserService {
  async findById(id: string): Promise<User | undefined> {
    await db.read();
    return db.data?.users.find(user => user.id === id);
  }

  async upsertFromOAuth(provider: OAuthProvider, profile: Profile, tokens: OAuthTokens): Promise<User> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const email = profile.emails?.[0]?.value;
    const avatar = profile.photos?.[0]?.value;

    let user = db.data.users.find(u =>
      (provider === 'google' ? u.google?.id === profile.id : u.facebook?.id === profile.id) ||
      (email ? u.email === email : false)
    );

    if (!user) {
      user = {
        id: `user_${randomUUID()}`,
        email: email ?? undefined,
        name: profile.displayName ?? 'Scribe User',
        avatar: avatar ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(profile.displayName ?? 'S A')}`,
      };
      db.data.users.push(user);
    }

    if (provider === 'google') {
      user.google = { id: profile.id, accessToken: tokens.accessToken };
    }

    if (provider === 'facebook') {
      user.facebook = { id: profile.id, accessToken: tokens.accessToken };
    }

    if (email && !user.email) {
      user.email = email;
    }

    if (avatar) {
      user.avatar = avatar;
    }

    if (profile.displayName) {
      user.name = profile.displayName;
    }

    await db.write();
    await organizationService.ensurePersonalWorkspace(user);
    return user;
  }

  async disconnectIntegration(userId: string, integration: OAuthProvider): Promise<void> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }
    const user = db.data.users.find(u => u.id === userId);
    if (!user) {
      throw new Error('User not found');
    }

    if (integration === 'google') {
      delete user.google;
    }

    if (integration === 'facebook') {
      delete user.facebook;
    }

    await db.write();
  }
}

export const userService = new UserService();
