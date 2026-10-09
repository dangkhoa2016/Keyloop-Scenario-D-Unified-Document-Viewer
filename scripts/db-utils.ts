import Database from 'better-sqlite3';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type DatabaseName = 'sales' | 'service' | 'unified-audit';
export function openDatabase(dir: string, name: DatabaseName): Database.Database {
  mkdirSync(dir, { recursive: true });
  const db = new Database(resolve(dir, name + '.sqlite'));
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 2000');
  return db;
}
export function migrateDir(dir: string): void {
  for (const name of ['sales', 'service', 'unified-audit'] as const) {
    const db = openDatabase(dir, name);
    try {
      db.pragma('journal_mode = WAL');
      db.exec(readFileSync(resolve('database', name + '.sql'), 'utf8'));
    } finally {
      db.close();
    }
  }
}
