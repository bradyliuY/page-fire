import Database from 'better-sqlite3'
import { readFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export function openDb(dbPath: string): Database.Database {
  mkdirSync(dirname(dbPath), { recursive: true })
  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  // Execute each statement individually (SQLite driver doesn't support multi-statement exec by default in strict mode)
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))
  for (const stmt of statements) {
    try {
      db.prepare(stmt).run()
    } catch {
      // PRAGMA statements return info, not rows — ignore errors from those
    }
  }

  // Column migrations — safe to run on existing DBs (errors mean column already exists)
  const colMigrations = [
    'ALTER TABLE deployments ADD COLUMN spa INTEGER NOT NULL DEFAULT 0',
    'ALTER TABLE tokens ADD COLUMN token_enc TEXT',
  ]
  for (const stmt of colMigrations) {
    try { db.prepare(stmt).run() } catch { /* column already exists */ }
  }

  return db
}
