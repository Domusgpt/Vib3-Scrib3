import { randomUUID } from 'crypto';
import { db } from '../../database/client';
import { getFirebaseFirestore, isFirebaseEnabled } from '../../config/firebase';
import { logger } from '../../lib/logger';
import {
  PluginSignup,
  PluginSignupFollowUp,
  PluginSignupReason,
  PluginSignupStatus,
  PluginSignupSummary,
  PluginSignupTouch,
} from '../../types';

export interface RecordPluginSignupPayload {
  email: string;
  source?: string;
  reason: PluginSignupReason;
  command?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

const DEFAULT_SOURCE = 'claude-code-plugin';
const DEFAULT_STATUS: PluginSignupStatus = 'new';

const isPluginSignupStatus = (value: unknown): value is PluginSignupStatus =>
  value === 'new' || value === 'contacted' || value === 'activated' || value === 'closed';

const sanitizeFollowUp = (value: unknown): PluginSignupFollowUp | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<PluginSignupFollowUp> & Record<string, unknown>;

  const handledAt = typeof raw.handledAt === 'string' ? raw.handledAt : new Date().toISOString();
  const status = isPluginSignupStatus(raw.status) ? raw.status : DEFAULT_STATUS;

  return {
    id: typeof raw.id === 'string' ? raw.id : `plugin_signup_follow_up_${randomUUID()}`,
    handledAt,
    status,
    handledById: typeof raw.handledById === 'string' && raw.handledById.length > 0 ? raw.handledById : 'unknown',
    handledByEmail:
      typeof raw.handledByEmail === 'string' && raw.handledByEmail.length > 0 ? raw.handledByEmail : undefined,
    handledByName:
      typeof raw.handledByName === 'string' && raw.handledByName.length > 0 ? raw.handledByName : undefined,
    note: typeof raw.note === 'string' && raw.note.length > 0 ? raw.note : undefined,
  };
};

const applySignupDefaults = (
  value: PluginSignup | (PluginSignup & Record<string, unknown>),
): PluginSignup => {
  const followUpsSource = Array.isArray((value as Record<string, unknown>).followUps)
    ? ((value as Record<string, unknown>).followUps as unknown[])
    : [];

  const followUps = followUpsSource
    .map(sanitizeFollowUp)
    .filter((item): item is PluginSignupFollowUp => item !== null)
    .sort((a, b) => new Date(a.handledAt).getTime() - new Date(b.handledAt).getTime());

  const statusCandidate = (value as Record<string, unknown>).status;
  const resolvedStatus = isPluginSignupStatus(statusCandidate)
    ? statusCandidate
    : followUps.at(-1)?.status ?? DEFAULT_STATUS;

  const lastFollowedUpAtCandidate = (value as Record<string, unknown>).lastFollowedUpAt;
  const resolvedLastFollowedUpAt =
    typeof lastFollowedUpAtCandidate === 'string' &&
    !Number.isNaN(new Date(lastFollowedUpAtCandidate).getTime())
      ? lastFollowedUpAtCandidate
      : followUps.length > 0
        ? followUps[followUps.length - 1].handledAt
        : null;

  return {
    ...value,
    status: resolvedStatus,
    followUps,
    lastFollowedUpAt: resolvedLastFollowedUpAt,
  };
};

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

const serializeFollowUpForFirebase = (followUp: PluginSignupFollowUp): Record<string, unknown> => {
  const record: Record<string, unknown> = {
    handledAt: followUp.handledAt,
    status: followUp.status,
    handledById: followUp.handledById,
  };

  if (followUp.handledByEmail) {
    record.handledByEmail = followUp.handledByEmail;
  }

  if (followUp.handledByName) {
    record.handledByName = followUp.handledByName;
  }

  if (followUp.note) {
    record.note = followUp.note;
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
      status: signup.status,
      followUps: signup.followUps.map(serializeFollowUpForFirebase),
      followUpCount: signup.followUps.length,
      lastFollowedUpAt: signup.lastFollowedUpAt,
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

    let mutated = false;
    const hydrated = signups.map(signup => {
      const normalized = applySignupDefaults(signup);
      const raw = signup as unknown as Record<string, unknown>;

      const statusOutOfDate = !isPluginSignupStatus(raw.status);
      const followUpsOutOfDate = !Array.isArray(raw.followUps);
      const lastFollowUpOutOfDate =
        (raw.lastFollowedUpAt ?? null) !== normalized.lastFollowedUpAt;

      if (statusOutOfDate || followUpsOutOfDate || lastFollowUpOutOfDate) {
        mutated = true;
      }

      return normalized;
    });

    if (mutated && db.data) {
      db.data.pluginSignups = hydrated;
      await db.write();
    }

    return [...hydrated].sort(
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

    const statusBreakdown: Record<PluginSignupStatus, number> = {
      new: 0,
      contacted: 0,
      activated: 0,
      closed: 0,
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

      statusBreakdown[signup.status] = (statusBreakdown[signup.status] ?? 0) + 1;

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
      breakdownByStatus: statusBreakdown,
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
      const hydrated = applySignupDefaults(existing);

      const mergedMetadata = isPlainObject(payload.metadata)
        ? { ...hydrated.metadata, ...payload.metadata }
        : hydrated.metadata;

      const updated: PluginSignup = {
        ...hydrated,
        lastCapturedAt: now,
        metadata: mergedMetadata,
        touches: [...hydrated.touches, touch],
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
      status: DEFAULT_STATUS,
      followUps: [],
      lastFollowedUpAt: null,
      metadata: isPlainObject(payload.metadata) ? payload.metadata : undefined,
    };

    db.data.pluginSignups.push(signup);
    await db.write();

    await syncSignupToFirebase(signup);

    return { signup, created: true, touch };
  }

  async recordFollowUp(
    id: string,
    status: PluginSignupStatus,
    handledBy: { id: string; email?: string | null; name?: string | null },
    note?: string,
  ): Promise<{ signup: PluginSignup; followUp: PluginSignupFollowUp }> {
    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    const signup = db.data.pluginSignups.find(item => item.id === id);
    if (!signup) {
      throw new Error('Signup not found');
    }

    const hydrated = applySignupDefaults(signup);
    const handledAt = new Date().toISOString();

    const followUp: PluginSignupFollowUp = {
      id: `plugin_signup_follow_up_${randomUUID()}`,
      handledAt,
      handledById: handledBy.id,
      handledByEmail: handledBy.email ?? undefined,
      handledByName: handledBy.name ?? undefined,
      status,
      note: note && note.trim().length > 0 ? note.trim() : undefined,
    };

    const updated: PluginSignup = {
      ...hydrated,
      status,
      followUps: [...hydrated.followUps, followUp],
      lastFollowedUpAt: handledAt,
    };

    Object.assign(signup, updated);
    await db.write();
    await syncSignupToFirebase(updated);

    return { signup: updated, followUp };
  }
}

export const pluginSignupService = new PluginSignupService();
