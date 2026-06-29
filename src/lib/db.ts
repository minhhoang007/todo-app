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

// Migrations: add columns that may not exist in older databases.
// SQLite doesn't support "ADD COLUMN IF NOT EXISTS", so we use try/catch.
try { db.exec(`ALTER TABLE todos ADD COLUMN category TEXT NOT NULL DEFAULT 'general'`); } catch { /* exists */ }
try { db.exec(`ALTER TABLE todos ADD COLUMN due_date TEXT`); } catch { /* exists */ }
try { db.exec(`ALTER TABLE todos ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'`); } catch { /* exists */ }

export default db;
