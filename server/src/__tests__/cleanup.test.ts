import { describe, it, expect } from 'vitest';
import { openDb } from '../db.js';
import { createGame, getGameBySlug } from '../repo.js';
import { deleteExpired } from '../cleanup.js';
import { buildApp } from '../app.js';

describe('Verlängern + Cleanup', () => {
  it('deleteExpired entfernt nur abgelaufene Spiele', () => {
    const db = openDb(':memory:');
    const g1 = createGame(db, { gameType: 'x01', options: {}, now: 0 });       // expires 86_400_000
    const g2 = createGame(db, { gameType: 'x01', options: {}, now: 1_000_000_000 });
    const removed = deleteExpired(db, 90_000_000);
    expect(removed).toBe(1);
    expect(getGameBySlug(db, g1.slug)).toBeNull();
    expect(getGameBySlug(db, g2.slug)).not.toBeNull();
  });

  it('extend verschiebt expiresAt um +1 Woche', async () => {
    const app = buildApp(openDb(':memory:'), () => 1000);
    const create = await app.inject({ method: 'POST', url: '/api/games', payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'straight' }, players: ['A'] } });
    const slug = create.json().slug;
    const res = await app.inject({ method: 'POST', url: `/api/games/${slug}/extend`, payload: { duration: '1w' } });
    expect(res.statusCode).toBe(200);
    expect(res.json().expiresAt).toBe(1000 + 86_400_000 + 7 * 86_400_000);
    await app.close();
  });
});
