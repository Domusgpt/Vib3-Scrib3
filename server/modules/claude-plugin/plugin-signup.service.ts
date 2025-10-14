import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { PluginSignup, PluginSignupStage } from '../../types';

interface RecordSignupPayload {
  email: string;
  name?: string;
  intent?: string;
  notes?: string;
  stage?: PluginSignupStage;
  command?: string;
  metadata?: Record<string, unknown>;
}

class PluginSignupService {
  private normaliseEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('A valid email address is required');
    }
  }

  async recordSignup(payload: RecordSignupPayload): Promise<PluginSignup> {
    if (!payload.email) {
      throw new Error('Email is required');
    }

    this.validateEmail(payload.email);

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const now = new Date().toISOString();
    const normalisedEmail = this.normaliseEmail(payload.email);

    let signup = db.data.pluginSignups.find(entry => this.normaliseEmail(entry.email) === normalisedEmail);

    if (!signup) {
      signup = {
        id: `plugin_signup_${randomUUID()}`,
        email: normalisedEmail,
        name: payload.name?.trim() || undefined,
        intent: payload.intent?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
        source: 'claude-code-plugin',
        stage: payload.stage ?? 'discovered',
        usageCount: 1,
        firstCommand: payload.command,
        lastCommand: payload.command,
        createdAt: now,
        updatedAt: now,
        metadata: payload.metadata,
      };

      db.data.pluginSignups.push(signup);
    } else {
      signup.name = payload.name?.trim() || signup.name;
      signup.intent = payload.intent?.trim() || signup.intent;
      signup.notes = payload.notes?.trim() || signup.notes;
      signup.metadata = payload.metadata ? { ...signup.metadata, ...payload.metadata } : signup.metadata;
      signup.lastCommand = payload.command ?? signup.lastCommand;
      signup.usageCount += 1;
      if (payload.stage && signup.stage !== 'converted') {
        signup.stage = payload.stage;
      }
      signup.updatedAt = now;
    }

    await db.write();
    return signup;
  }

  async list(): Promise<PluginSignup[]> {
    await db.read();
    const signups = db.data?.pluginSignups ?? [];
    return [...signups].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async markConverted(userId: string, email?: string): Promise<PluginSignup | null> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    if (!db.data.pluginSignups.length) {
      return null;
    }

    const normalisedEmail = email ? this.normaliseEmail(email) : undefined;
    const signup = db.data.pluginSignups.find(entry =>
      normalisedEmail ? this.normaliseEmail(entry.email) === normalisedEmail : entry.userId === userId,
    );

    if (!signup) {
      return null;
    }

    signup.userId = userId;
    signup.stage = 'converted';
    signup.updatedAt = new Date().toISOString();

    await db.write();
    return signup;
  }
}

export const pluginSignupService = new PluginSignupService();
