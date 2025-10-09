import path from 'path';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { createDefaultSchema, DatabaseSchema } from './schema';
import { logger } from '../lib/logger';

const dbFilePath = path.resolve(process.cwd(), 'server/db.json');

const adapter = new JSONFile<DatabaseSchema>(dbFilePath);
const defaultData = createDefaultSchema();
export const db = new Low<DatabaseSchema>(adapter, defaultData);

let isInitialized = false;

export const initDatabase = async () => {
  if (isInitialized) return;
  await db.read();
  if (!db.data) {
    db.data = defaultData;
  }
  isInitialized = true;
  logger.info('Database initialized', { path: dbFilePath });
};
