import path from 'path';
import { fileURLToPath } from 'url';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

import {
  ApiKey,
  IntegrationConnection,
  License,
  StyleProfile,
  Subscription,
  Tenant,
  UsageRecord,
  User,
} from '../../../types';

interface DatabaseSchema {
  users: User[];
  tenants: Tenant[];
  subscriptions: Subscription[];
  licenses: License[];
  styleProfiles: StyleProfile[];
  integrationConnections: IntegrationConnection[];
  apiKeys: ApiKey[];
  usage: UsageRecord[];
}

const defaultData: DatabaseSchema = {
  users: [],
  tenants: [],
  subscriptions: [],
  licenses: [],
  styleProfiles: [],
  integrationConnections: [],
  apiKeys: [],
  usage: [],
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFile = path.resolve(__dirname, '../../db.json');

const adapter = new JSONFile<DatabaseSchema>(dbFile);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

await db.read();
if (!db.data) {
  db.data = defaultData;
  await db.write();
}

export type { DatabaseSchema };
