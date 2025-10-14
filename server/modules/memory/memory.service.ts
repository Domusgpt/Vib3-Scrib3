import { randomUUID } from 'crypto';
import type { CollectionReference, FirestoreDataConverter, Query } from 'firebase-admin/firestore';
import { db } from '../../database/client';
import { firebaseCollections, getFirestore } from '../../lib/firebaseAdmin';
import {
  ClaudeMemory,
  ClaudeMemoryCategory,
  ClaudeMemorySourceArtifact,
  StyleProfile,
} from '../../types';

interface CreateMemoryPayload {
  category: ClaudeMemoryCategory;
  title: string;
  summary: string;
  highlights: string[];
  sourceArtifacts?: ClaudeMemorySourceArtifact[];
  metadata?: Record<string, unknown>;
}

interface ListMemoriesFilters {
  category?: ClaudeMemoryCategory;
  limit?: number;
}

export interface MemoryPrimer {
  generatedAt: string;
  activeProfile: StyleProfile | null;
  memories: {
    context: ClaudeMemory | null;
    style: ClaudeMemory | null;
  };
  statuses: {
    context: 'missing' | 'stale' | 'fresh';
    style: 'missing' | 'stale' | 'fresh';
  };
  summary: string[];
  recommendedActions: string[];
}

const DAYS_BEFORE_CONTEXT_REFRESH = 7;
const DAYS_BEFORE_STYLE_REFRESH = 14;

const calculateAgeInDays = (isoDate: string, now: Date) => {
  const target = new Date(isoDate);
  const diff = now.getTime() - target.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

const formatAgeDescription = (ageDays: number) => {
  if (ageDays <= 0) return 'today';
  if (ageDays === 1) return '1 day ago';
  return `${ageDays} days ago`;
};

const memoryConverter: FirestoreDataConverter<ClaudeMemory> = {
  toFirestore: memory => memory,
  fromFirestore: snapshot => snapshot.data() as ClaudeMemory,
};

const getMemoryCollection = (): CollectionReference<ClaudeMemory> | null => {
  const firestore = getFirestore();
  if (!firestore) {
    return null;
  }

  return firestore.collection(firebaseCollections.memories).withConverter(memoryConverter);
};

class MemoryService {
  async list(userId: string, filters: ListMemoriesFilters = {}): Promise<ClaudeMemory[]> {
    const collection = getMemoryCollection();

    if (collection) {
      let query: Query<ClaudeMemory> = collection
        .where('userId', '==', userId)
        .orderBy('updatedAt', 'desc');

      if (filters.category) {
        query = query.where('category', '==', filters.category);
      }

      if (filters.limit && filters.limit > 0) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      return snapshot.docs.map(doc => doc.data());
    }

    await db.read();
    const memories = db.data?.claudeMemories.filter(memory => memory.userId === userId) ?? [];

    const filtered = filters.category
      ? memories.filter(memory => memory.category === filters.category)
      : memories;

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    if (filters.limit && filters.limit > 0) {
      return sorted.slice(0, filters.limit);
    }

    return sorted;
  }

  async create(userId: string, payload: CreateMemoryPayload): Promise<ClaudeMemory> {
    const now = new Date().toISOString();
    const memory: ClaudeMemory = {
      id: `memory_${randomUUID()}`,
      userId,
      category: payload.category,
      title: payload.title,
      summary: payload.summary,
      highlights: payload.highlights,
      sourceArtifacts: payload.sourceArtifacts ?? [],
      metadata: payload.metadata,
      createdAt: now,
      updatedAt: now,
    };

    const collection = getMemoryCollection();

    if (collection) {
      await collection.doc(memory.id).set(memory);
      return memory;
    }

    await db.read();
    if (!db.data) {
      throw new Error('Database not initialized');
    }

    db.data.claudeMemories.push(memory);
    await db.write();
    return memory;
  }

  async findLatest(userId: string, category: ClaudeMemoryCategory): Promise<ClaudeMemory | null> {
    const [latest] = await this.list(userId, { category, limit: 1 });
    return latest ?? null;
  }

  async buildPrimer(userId: string, activeProfileId?: string | null): Promise<MemoryPrimer> {
    const now = new Date();
    const contextMemory = await this.findLatest(userId, 'context');
    const styleMemory = await this.findLatest(userId, 'style');

    await db.read();
    const allProfiles = db.data?.style_profiles
      .filter(profile => profile.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) ?? [];

    const activeProfile: StyleProfile | null = activeProfileId
      ? allProfiles.find(profile => profile.id === activeProfileId) ?? null
      : allProfiles[0] ?? null;

    const contextAge = contextMemory ? calculateAgeInDays(contextMemory.updatedAt, now) : null;
    const styleAge = styleMemory ? calculateAgeInDays(styleMemory.updatedAt, now) : null;

    const contextStatus: 'missing' | 'stale' | 'fresh' = !contextMemory
      ? 'missing'
      : contextAge !== null && contextAge > DAYS_BEFORE_CONTEXT_REFRESH
      ? 'stale'
      : 'fresh';

    const styleStatus: 'missing' | 'stale' | 'fresh' = !styleMemory
      ? 'missing'
      : styleAge !== null && styleAge > DAYS_BEFORE_STYLE_REFRESH
      ? 'stale'
      : 'fresh';

    const summary: string[] = [];
    if (activeProfile) {
      summary.push(
        `Active profile "${activeProfile.name}" captured ${formatAgeDescription(
          calculateAgeInDays(activeProfile.createdAt, now),
        )}.`,
      );
    } else {
      summary.push('No active style profile selected in Vib3 Scribe.');
    }

    if (styleMemory) {
      summary.push(
        `Latest style memory "${styleMemory.title}" saved ${formatAgeDescription(styleAge ?? 0)} (${styleStatus}).`,
      );
    } else {
      summary.push('No saved style memory found.');
    }

    if (contextMemory) {
      summary.push(
        `Latest context memory "${contextMemory.title}" saved ${formatAgeDescription(
          contextAge ?? 0,
        )} (${contextStatus}).`,
      );
    } else {
      summary.push('No saved context memory found.');
    }

    const recommendedActions: string[] = [];
    if (!contextMemory) {
      recommendedActions.push('Run /context-harvest to capture the latest initiatives and documents.');
    } else if (contextStatus === 'stale') {
      recommendedActions.push('Refresh /context-harvest so Claude has up-to-date project context.');
    }

    if (!styleMemory) {
      recommendedActions.push('Run /style-sync to create a Claude memory for the active Vib3 profile.');
    } else if (styleStatus === 'stale') {
      recommendedActions.push('Refresh /style-sync to keep tone and phrasing aligned with recent samples.');
    }

    if (!activeProfile) {
      recommendedActions.push('Create or select an active style profile inside Vib3 Scribe.');
    }

    const metadataProfileId =
      styleMemory &&
      styleMemory.metadata &&
      typeof styleMemory.metadata === 'object'
        ? (styleMemory.metadata as Record<string, unknown>).profileId
        : undefined;

    if (typeof metadataProfileId === 'string' && activeProfile && metadataProfileId !== activeProfile.id) {
      recommendedActions.push('Style memory references a different profile—rerun /style-sync for the active profile.');
    }

    return {
      generatedAt: now.toISOString(),
      activeProfile,
      memories: {
        context: contextMemory,
        style: styleMemory,
      },
      statuses: {
        context: contextStatus,
        style: styleStatus,
      },
      summary,
      recommendedActions,
    };
  }
}

export const memoryService = new MemoryService();
