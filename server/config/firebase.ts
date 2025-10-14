import { AppOptions, ServiceAccount, cert, getApps, initializeApp } from 'firebase-admin/app';
import { Firestore, getFirestore } from 'firebase-admin/firestore';
import { env } from './env';
import { logger } from '../lib/logger';

let firestore: Firestore | null = null;

const hasServiceAccountEnv = () =>
  Boolean(env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY);

const getCredentials = (): ServiceAccount | null => {
  if (env.FIREBASE_CREDENTIALS_JSON) {
    try {
      return JSON.parse(env.FIREBASE_CREDENTIALS_JSON) as ServiceAccount;
    } catch (error) {
      logger.error('Invalid FIREBASE_CREDENTIALS_JSON provided.', { error });
      return null;
    }
  }

  if (!hasServiceAccountEnv()) {
    return null;
  }

  return {
    projectId: env.FIREBASE_PROJECT_ID!,
    clientEmail: env.FIREBASE_CLIENT_EMAIL!,
    privateKey: env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
  };
};

export const isFirebaseEnabled = (): boolean => {
  if (firestore) return true;
  if (env.FIREBASE_EMULATOR_HOST) {
    return true;
  }
  return Boolean(env.FIREBASE_CREDENTIALS_JSON || hasServiceAccountEnv());
};

export const getFirebaseFirestore = (): Firestore | null => {
  if (firestore) {
    return firestore;
  }

  const credentials = getCredentials();
  if (!credentials && !env.FIREBASE_EMULATOR_HOST) {
    return null;
  }

  try {
    const options: AppOptions = {};

    if (credentials) {
      options.credential = cert(credentials);
      options.projectId = credentials.projectId;
    }

    if (!options.projectId) {
      options.projectId = env.FIREBASE_PROJECT_ID ?? 'vib3-scribe-dev';
    }

    if (!getApps().length) {
      initializeApp(options);
    }

    firestore = getFirestore();

    if (env.FIREBASE_EMULATOR_HOST) {
      firestore.settings({ host: env.FIREBASE_EMULATOR_HOST, ssl: false });
      logger.info('Firebase Firestore emulator configured for Vib3 Scribe.');
    } else {
      logger.info('Firebase Firestore initialized for Vib3 Scribe.');
    }

    return firestore;
  } catch (error) {
    logger.error('Failed to initialize Firebase Firestore.', { error });
    firestore = null;
    return null;
  }
};
