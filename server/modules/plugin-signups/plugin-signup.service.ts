import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { getFirebaseFirestore, isFirebaseEnabled } from '../../config/firebase';
import { logger } from '../../lib/logger';
import { PluginSignup, PluginSignupReason, PluginSignupSummary, PluginSignupTouch } from '../../types';

export interface RecordPluginSignupPayload {
  email: string;
  source?: string;
  reason: PluginSignupReason;
  command?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_SOURCE = 'claude-code-plugin';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const buildFirebaseDocId = (email: string, source: string) => {
  const normalizedSource = source.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  const encodedEmail = Buffer.from(email).toString('hex');
  return `${normalizedSource}__${encodedEmail}`;
};

const serializeTouchForFirebase = (touch: PluginSignupTouch): Record<string, unknown> => {
  const record: Record<string, unknown> = {
    reason: touch.reason,
    capturedAt: touch.capturedAt,
  };

  if (touch.command) {
    record.command = touch.command;
  }

  if (touch.note) {
    record.note = touch.note;
  }

  if (touch.metadata && Object.keys(touch.metadata).length > 0) {
    record.metadata = touch.metadata;
  }

  return record;
};

const syncSignupToFirebase = async (signup: PluginSignup) => {
  if (!isFirebaseEnabled()) {
    return;
  }

  const firestore = getFirebaseFirestore();
  if (!firestore) {
    return;
  }

  try {
    const docId = buildFirebaseDocId(signup.email, signup.source);
    const docRef = firestore.collection('pluginSignups').doc(docId);

    const payload: Record<string, unknown> = {
      email: signup.email,
      source: signup.source,
      firstCapturedAt: signup.firstCapturedAt,
      lastCapturedAt: signup.lastCapturedAt,
      touches: signup.touches.map(serializeTouchForFirebase),
      touchCount: signup.touches.length,
    };

    if (signup.metadata && Object.keys(signup.metadata).length > 0) {
      payload.metadata = signup.metadata;
    }

    await docRef.set(payload, { merge: true });
  } catch (error) {
    logger.error('Failed to sync plugin signup to Firebase.', { error });
  }
};

class PluginSignupService {
  async list(): Promise<PluginSignup[]> {
    await db.read();
    const signups = db.data?.pluginSignups ?? [];
    return [...signups].sort(
      (a, b) => new Date(b.lastCapturedAt).getTime() - new Date(a.lastCapturedAt).getTime(),
    );
  }

  summarize(signups: PluginSignup[]): PluginSignupSummary {
    const breakdown: Record<PluginSignupReason, number> = {
      'memory-access': 0,
      'profile-sync': 0,
      'advanced-tools': 0,
      other: 0,
    };

    let lastCapturedAt: string | null = null;
    let newInLast7Days = 0;
    let multiTouchCount = 0;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    signups.forEach(signup => {
      if (!lastCapturedAt || new Date(signup.lastCapturedAt).getTime() > new Date(lastCapturedAt).getTime()) {
        lastCapturedAt = signup.lastCapturedAt;
      }

      if (new Date(signup.lastCapturedAt).getTime() >= sevenDaysAgo) {
        newInLast7Days += 1;
      }

      if (signup.touches.length > 1) {
        multiTouchCount += 1;
      }

      signup.touches.forEach(touch => {
        breakdown[touch.reason] = (breakdown[touch.reason] ?? 0) + 1;
      });
    });

    return {
      total: signups.length,
      lastCapturedAt,
      newInLast7Days,
      multiTouchCount,
      breakdownByReason: breakdown,
    };
  }

  async getSummary(): Promise<PluginSignupSummary> {
    const signups = await this.list();
    return this.summarize(signups);
  }

  async record(
    payload: RecordPluginSignupPayload,
  ): Promise<{ signup: PluginSignup; created: boolean; touch: PluginSignupTouch }> {
    if (!payload.email) {
      throw new Error('Email is required to record a plugin signup.');
    }

    const email = normalizeEmail(payload.email);
    const source = (payload.source ?? DEFAULT_SOURCE).trim() || DEFAULT_SOURCE;
    const now = new Date().toISOString();

    const touch: PluginSignupTouch = {
      reason: payload.reason,
      command: payload.command,
      note: payload.note,
      capturedAt: now,
      metadata: isPlainObject(payload.metadata) ? payload.metadata : undefined,
    };

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const existing = db.data.pluginSignups.find(
      signup => signup.email === email && signup.source === source,
    );

    if (existing) {
      const mergedMetadata = isPlainObject(payload.metadata)
        ? { ...existing.metadata, ...payload.metadata }
        : existing.metadata;

      const updated: PluginSignup = {
        ...existing,
        lastCapturedAt: now,
        metadata: mergedMetadata,
        touches: [...existing.touches, touch],
      };

      Object.assign(existing, updated);
      await db.write();
      await syncSignupToFirebase(updated);
      return { signup: updated, created: false, touch };
    }

    const signup: PluginSignup = {
      id: `plugin_signup_${randomUUID()}`,
      email,
      source,
      firstCapturedAt: now,
      lastCapturedAt: now,
      touches: [touch],
      metadata: isPlainObject(payload.metadata) ? payload.metadata : undefined,
    };

    db.data.pluginSignups.push(signup);
    await db.write();

    await syncSignupToFirebase(signup);

    return { signup, created: true, touch };
  }
}

export const pluginSignupService = new PluginSignupService();
