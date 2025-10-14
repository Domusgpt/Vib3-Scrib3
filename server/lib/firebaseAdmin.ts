import admin from 'firebase-admin';
import 'firebase-admin/firestore';
import { env } from '../config/env';
import { logger } from './logger';

let firebaseApp: admin.app.App | null = null;

const hasFirebaseCredentials =
  Boolean(env.FIREBASE_PROJECT_ID) &&
  Boolean(env.FIREBASE_CLIENT_EMAIL) &&
  Boolean(env.FIREBASE_PRIVATE_KEY);

const formatPrivateKey = (key: string) => key.replace(/\\n/g, '\n');

export const getFirebaseApp = (): admin.app.App | null => {
  if (!hasFirebaseCredentials) {
    return null;
  }

  if (!firebaseApp) {
    const privateKey = formatPrivateKey(env.FIREBASE_PRIVATE_KEY!);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.FIREBASE_PROJECT_ID!,
        clientEmail: env.FIREBASE_CLIENT_EMAIL!,
        privateKey,
      }),
      projectId: env.FIREBASE_PROJECT_ID!,
    });

    logger.info('Firebase Admin initialized for Vib3 Scribe', {
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  return firebaseApp;
};

export const getFirestore = (): admin.firestore.Firestore | null => {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  return admin.firestore(app);
};

export const firebaseCollections = {
  memories: env.FIREBASE_MEMORIES_COLLECTION ?? 'claudeMemories',
  signups: env.FIREBASE_SIGNUPS_COLLECTION ?? 'pluginSignups',
};

export const isFirebaseEnabled = () => hasFirebaseCredentials;
