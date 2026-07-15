import type { DB } from './db.js';
import type { GameType } from './engine/index.js';
import * as ids from './ids.js';

export interface GameRow {
  id: number;
  slug: string;
  gameType: GameType;
  options: unknown;
  status: 'lobby' | 'running' | 'finished';
  createdAt: number;
  expiresAt: number;
}

const DAY_MS = 86_400_000;

interface GameDbRow {
  id: number; slug: string; game_type: string; options: string;
  status: string; created_at: number; expires_at: number;
}

function mapGame(r: GameDbRow): GameRow {
  return {
    id: r.id, slug: r.slug, gameType: r.game_type as GameType,
    options: JSON.parse(r.options), status: r.status as GameRow['status'],
    createdAt: r.created_at, expiresAt: r.expires_at,
  };
}

export function createGame(db: DB, input: { gameType: GameType; options: unknown; now: number }): GameRow {
  const s = ids.slug();
  const expiresAt = input.now + DAY_MS;
  const info = db.prepare(
    `INSERT INTO games (slug, game_type, options, status, created_at, expires_at)
     VALUES (?, ?, ?, 'lobby', ?, ?)`,
  ).run(s, input.gameType, JSON.stringify(input.options), input.now, expiresAt);
  const row = db.prepare('SELECT * FROM games WHERE id = ?').get(info.lastInsertRowid) as unknown as GameDbRow;
  return mapGame(row);
}

export function getGameBySlug(db: DB, slug: string): GameRow | null {
  const row = db.prepare('SELECT * FROM games WHERE slug = ?').get(slug) as GameDbRow | undefined;
  return row ? mapGame(row) : null;
}

export interface PlayerRow {
  id: string; name: string; order: number; joinedAtRound: number; catchUp: 'catchUp' | 'handicap';
}
interface PlayerDbRow { id: string; name: string; order_idx: number; joined_at_round: number; catch_up: string; }
function mapPlayer(r: PlayerDbRow): PlayerRow {
  return { id: r.id, name: r.name, order: r.order_idx, joinedAtRound: r.joined_at_round, catchUp: r.catch_up as PlayerRow['catchUp'] };
}

export function addPlayer(
  db: DB,
  gameId: number,
  input: { name: string; joinedAtRound?: number; catchUp?: 'catchUp' | 'handicap' },
): PlayerRow {
  const next = db.prepare('SELECT COALESCE(MAX(order_idx) + 1, 0) AS n FROM players WHERE game_id = ?').get(gameId) as { n: number };
  const id = ids.playerId();
  db.prepare(
    `INSERT INTO players (id, game_id, name, order_idx, joined_at_round, catch_up)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, gameId, input.name, next.n, input.joinedAtRound ?? 0, input.catchUp ?? 'handicap');
  return { id, name: input.name, order: next.n, joinedAtRound: input.joinedAtRound ?? 0, catchUp: input.catchUp ?? 'handicap' };
}

export function listPlayers(db: DB, gameId: number): PlayerRow[] {
  const rows = db.prepare('SELECT * FROM players WHERE game_id = ? ORDER BY order_idx').all(gameId) as unknown as PlayerDbRow[];
  return rows.map(mapPlayer);
}

export interface EventRow { seq: number; playerId: string; segment: number; multiplier: number; }
interface EventDbRow { seq: number; player_id: string; segment: number; multiplier: number; }

export function appendThrow(
  db: DB,
  gameId: number,
  dart: { playerId: string; segment: number; multiplier: number },
): EventRow {
  const next = db.prepare('SELECT COALESCE(MAX(seq) + 1, 1) AS n FROM throw_events WHERE game_id = ?').get(gameId) as { n: number };
  db.prepare(
    `INSERT INTO throw_events (game_id, seq, player_id, segment, multiplier) VALUES (?, ?, ?, ?, ?)`,
  ).run(gameId, next.n, dart.playerId, dart.segment, dart.multiplier);
  return { seq: next.n, playerId: dart.playerId, segment: dart.segment, multiplier: dart.multiplier };
}

export function listThrows(db: DB, gameId: number): EventRow[] {
  const rows = db.prepare('SELECT seq, player_id, segment, multiplier FROM throw_events WHERE game_id = ? ORDER BY seq').all(gameId) as unknown as EventDbRow[];
  return rows.map((r) => ({ seq: r.seq, playerId: r.player_id, segment: r.segment, multiplier: r.multiplier }));
}

export function undoLastThrow(db: DB, gameId: number): EventRow | null {
  const row = db.prepare('SELECT seq, player_id, segment, multiplier FROM throw_events WHERE game_id = ? ORDER BY seq DESC LIMIT 1').get(gameId) as EventDbRow | undefined;
  if (!row) return null;
  db.prepare('DELETE FROM throw_events WHERE game_id = ? AND seq = ?').run(gameId, row.seq);
  return { seq: row.seq, playerId: row.player_id, segment: row.segment, multiplier: row.multiplier };
}

export function setStatus(db: DB, gameId: number, status: 'lobby' | 'running' | 'finished'): void {
  db.prepare('UPDATE games SET status = ? WHERE id = ?').run(status, gameId);
}

/**
 * Setzt ein Spiel für „Neustarten" / „Modus wechseln" zurück: alle Würfe löschen,
 * optional Spieltyp/Optionen ändern, Aufhol-Info der Spieler*innen zurücksetzen
 * (alle starten wieder gleichauf) und Status auf 'lobby'.
 */
export function resetGame(db: DB, gameId: number, change?: { gameType: GameType; options: unknown }): void {
  db.prepare('DELETE FROM throw_events WHERE game_id = ?').run(gameId);
  db.prepare("UPDATE players SET joined_at_round = 0, catch_up = 'handicap' WHERE game_id = ?").run(gameId);
  if (change) {
    db.prepare('UPDATE games SET game_type = ?, options = ?, status = ? WHERE id = ?')
      .run(change.gameType, JSON.stringify(change.options), 'lobby', gameId);
  } else {
    db.prepare("UPDATE games SET status = 'lobby' WHERE id = ?").run(gameId);
  }
}

export function extendGame(db: DB, gameId: number, addMs: number): number {
  const row = db.prepare('SELECT expires_at FROM games WHERE id = ?').get(gameId) as { expires_at: number } | undefined;
  if (!row) throw new Error('game not found');
  const next = row.expires_at + addMs;
  db.prepare('UPDATE games SET expires_at = ? WHERE id = ?').run(next, gameId);
  return next;
}

export function countActiveGames(db: DB, now: number): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM games WHERE expires_at > ?').get(now) as { n: number };
  return row.n;
}

/** Anzahl „langlebiger" Spiele: solche, deren Ablauf weiter als `ts` in der Zukunft liegt. */
export function countGamesExpiringAfter(db: DB, ts: number): number {
  const row = db.prepare('SELECT COUNT(*) AS n FROM games WHERE expires_at > ?').get(ts) as { n: number };
  return row.n;
}
