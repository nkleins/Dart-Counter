// NOTE: vite-node 2.1.9 (bundled with vitest) has a stale builtin-module
// allowlist that predates `node:sqlite` and mis-resolves the static import
// specifier `from 'node:sqlite'` (strips the prefix, then fails to resolve
// bare `sqlite`). Node itself resolves it fine; the failure is a vite-node
// tooling bug. Using process.getBuiltinModule sidesteps vite-node's
// import-specifier transform entirely (it's a runtime call, not a static
// import), giving the identical node:sqlite module.
import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';

const { DatabaseSync } = process.getBuiltinModule('node:sqlite') as typeof import('node:sqlite');

export type DB = DatabaseSyncType;

export function openDb(path: string): DB {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      game_type TEXT NOT NULL,
      options TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'lobby',
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      order_idx INTEGER NOT NULL,
      joined_at_round INTEGER NOT NULL DEFAULT 0,
      catch_up TEXT NOT NULL DEFAULT 'handicap'
    );
    CREATE TABLE IF NOT EXISTS throw_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      seq INTEGER NOT NULL,
      player_id TEXT NOT NULL,
      segment INTEGER NOT NULL,
      multiplier INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_game ON throw_events(game_id, seq);
    CREATE INDEX IF NOT EXISTS idx_players_game ON players(game_id, order_idx);
    CREATE INDEX IF NOT EXISTS idx_games_expires ON games(expires_at);
  `);
  return db;
}
