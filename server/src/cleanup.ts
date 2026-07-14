import type { DB } from './db.js';

export function deleteExpired(db: DB, now: number): number {
  const info = db.prepare('DELETE FROM games WHERE expires_at <= ?').run(now);
  return Number(info.changes);
}

/** Startet einen periodischen Cleanup-Timer. Gibt eine Stop-Funktion zurück. */
export function startCleanup(db: DB, intervalMs = 600_000, now: () => number = () => Date.now()): () => void {
  const timer = setInterval(() => { deleteExpired(db, now()); }, intervalMs);
  timer.unref?.();
  return () => clearInterval(timer);
}
