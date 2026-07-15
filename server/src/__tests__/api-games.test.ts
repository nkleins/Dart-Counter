import { describe, it, expect, vi } from 'vitest';
import { openDb } from '../db.js';
import { buildApp } from '../app.js';
import { createGame, countActiveGames } from '../repo.js';
import { openDb as openDb2 } from '../db.js';

describe('API: Spiele', () => {
  it('erstellt ein Spiel und liefert es per Slug', async () => {
    const app = buildApp(openDb(':memory:'), () => 1000);
    const create = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double' }, players: ['Mia', 'Ben'] },
    });
    expect(create.statusCode).toBe(201);
    const { slug } = create.json();
    expect(slug).toHaveLength(10);

    const get = await app.inject({ method: 'GET', url: `/api/games/${slug}` });
    expect(get.statusCode).toBe(200);
    const body = get.json();
    expect(body.gameType).toBe('x01');
    expect(body.players.map((p: { name: string }) => p.name)).toEqual(['Mia', 'Ben']);
    expect(body.state.currentPlayerId).toBe(body.players[0].id);
    expect(body.expiresAt).toBe(1000 + 86_400_000);
    await app.close();
  });
  it('unbekannter Slug -> 404', async () => {
    const app = buildApp(openDb(':memory:'));
    const res = await app.inject({ method: 'GET', url: '/api/games/unknown' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('unbekannter gameType -> 400, kein Spiel wird erstellt', async () => {
    const db = openDb(':memory:');
    const app = buildApp(db);
    const res = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'pwn', options: {}, players: ['A'] },
    });
    expect(res.statusCode).toBe(400);
    expect(countActiveGames(db, 0)).toBe(0);
    await app.close();
  });

  it('x01 ohne options.start -> 400', async () => {
    const app = buildApp(openDb(':memory:'));
    const res = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: {}, players: ['A'] },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('ohne Spieler*innen -> 400, kein Spiel wird erstellt', async () => {
    const db = openDb(':memory:');
    const app = buildApp(db);
    const res = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double' }, players: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(countActiveGames(db, 0)).toBe(0);
    // auch nur-Leerzeichen-Namen zählen nicht
    const res2 = await app.inject({
      method: 'POST', url: '/api/games',
      payload: { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double' }, players: ['  '] },
    });
    expect(res2.statusCode).toBe(400);
    await app.close();
  });
});

describe('API: globaler Deckel', () => {
  it('429 wenn zu viele aktive Spiele', async () => {
    const db = openDb2(':memory:');
    // Deckel künstlich niedrig via ENV
    process.env.MAX_ACTIVE_GAMES = '1';
    vi.resetModules();
    const { buildApp } = await import('../app.js');
    createGame(db, { gameType: 'x01', options: {}, now: Date.now() });
    const app = buildApp(db);
    const res = await app.inject({ method: 'POST', url: '/api/games', payload: { gameType: 'x01', options: {}, players: ['A'] } });
    expect(res.statusCode).toBe(429);
    await app.close();
    delete process.env.MAX_ACTIVE_GAMES;
  });
});
