import { randomUUID } from 'crypto';
import type { CollectionReference, FirestoreDataConverter } from 'firebase-admin/firestore';
import { db } from '../../database/client';
import { firebaseCollections, getFirestore } from '../../lib/firebaseAdmin';
import { PluginSignup, PluginSignupReason, PluginSignupTouch } from '../../types';

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

const signupConverter: FirestoreDataConverter<PluginSignup> = {
  toFirestore: signup => signup,
  fromFirestore: snapshot => snapshot.data() as PluginSignup,
};

const getSignupCollection = (): CollectionReference<PluginSignup> | null => {
  const firestore = getFirestore();
  if (!firestore) {
    return null;
  }

  return firestore.collection(firebaseCollections.signups).withConverter(signupConverter);
};

const buildDocumentId = (email: string, source: string) => {
  const encoded = Buffer.from(`${source}:${email}`).toString('base64url');
  return `signup_${encoded}`;
};

class PluginSignupService {
  async list(): Promise<PluginSignup[]> {
    const collection = getSignupCollection();

    if (collection) {
      const snapshot = await collection.orderBy('lastCapturedAt', 'desc').get();
      return snapshot.docs.map(doc => doc.data());
    }

    await db.read();
    return db.data?.pluginSignups ?? [];
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

    const collection = getSignupCollection();

    if (collection) {
      const docId = buildDocumentId(email, source);
      const docRef = collection.doc(docId);
      const snapshot = await docRef.get();

      if (snapshot.exists) {
        const existing = snapshot.data();
        if (!existing) {
          throw new Error('Signup document exists in Firestore but returned no data');
        }

        const existingMetadata = isPlainObject(existing.metadata)
          ? existing.metadata
          : undefined;

        const mergedMetadata = isPlainObject(payload.metadata)
          ? { ...(existingMetadata ?? {}), ...payload.metadata }
          : existingMetadata;

        const updated: PluginSignup = {
          ...existing,
          lastCapturedAt: now,
          metadata: mergedMetadata,
          touches: [...existing.touches, touch],
        };

        await docRef.set(updated, { merge: false });
        return { signup: updated, created: false, touch };
      }

      const signup: PluginSignup = {
        id: docId,
        email,
        source,
        firstCapturedAt: now,
        lastCapturedAt: now,
        touches: [touch],
        metadata: isPlainObject(payload.metadata) ? payload.metadata : undefined,
      };

      await docRef.set(signup, { merge: false });
      return { signup, created: true, touch };
    }

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

    return { signup, created: true, touch };
  }
}

export const pluginSignupService = new PluginSignupService();
