import Database from 'better-sqlite3';
import { join } from 'path';

const db = new Database(join(process.cwd(), 'todos.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT    NOT NULL,
    done       INTEGER NOT NULL DEFAULT 0,
    category   TEXT    NOT NULL DEFAULT 'general',
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
  )
`);

// Migration: add the category column if this is an existing database that doesn't have it yet.
// SQLite doesn't support "ADD COLUMN IF NOT EXISTS", so we use try/catch instead.
try {
  db.exec(`ALTER TABLE todos ADD COLUMN category TEXT NOT NULL DEFAULT 'general'`);
} catch {
  // Column already exists — nothing to do.
}

export default db;
