import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { User, StyleProfile, License } from '../types';

type DbSchema = {
  users: User[];
  style_profiles: StyleProfile[];
  licenses: License[];
};

const defaultData: DbSchema = {
  users: [],
  style_profiles: [],
  licenses: [],
};

const adapter = new JSONFile<DbSchema>('db.json');
export const db = new Low<DbSchema>(adapter, defaultData);

// Read data from disk
await db.read();
