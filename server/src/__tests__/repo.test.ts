import { describe, it, expect } from 'vitest';
import { openDb } from '../db.js';
import { createGame, getGameBySlug } from '../repo.js';
import { addPlayer, listPlayers, appendThrow, listThrows, undoLastThrow } from '../repo.js';

describe('Games-Repo', () => {
  it('legt ein Spiel an und liest es per Slug', () => {
    const db = openDb(':memory:');
    const g = createGame(db, { gameType: 'x01', options: { start: 501, in: 'straight', out: 'double' }, now: 1000 });
    expect(g.slug).toHaveLength(10);
    expect(g.expiresAt).toBe(1000 + 86_400_000);
    const loaded = getGameBySlug(db, g.slug);
    expect(loaded?.gameType).toBe('x01');
    expect(loaded?.options).toEqual({ start: 501, in: 'straight', out: 'double' });
  });
  it('unbekannter Slug -> null', () => {
    const db = openDb(':memory:');
    expect(getGameBySlug(db, 'nope')).toBeNull();
  });
});

describe('Players & Events', () => {
  it('fügt Spieler in Reihenfolge hinzu', () => {
    const db = openDb(':memory:');
    const g = createGame(db, { gameType: 'x01', options: {}, now: 0 });
    const a = addPlayer(db, g.id, { name: 'A' });
    const b = addPlayer(db, g.id, { name: 'B' });
    expect(a.order).toBe(0);
    expect(b.order).toBe(1);
    expect(listPlayers(db, g.id).map(p => p.name)).toEqual(['A', 'B']);
  });
  it('append vergibt fortlaufende seq, undo entfernt den letzten', () => {
    const db = openDb(':memory:');
    const g = createGame(db, { gameType: 'x01', options: {}, now: 0 });
    const a = addPlayer(db, g.id, { name: 'A' });
    const e1 = appendThrow(db, g.id, { playerId: a.id, segment: 20, multiplier: 3 });
    const e2 = appendThrow(db, g.id, { playerId: a.id, segment: 20, multiplier: 1 });
    expect(e1.seq).toBe(1);
    expect(e2.seq).toBe(2);
    expect(listThrows(db, g.id)).toHaveLength(2);
    const removed = undoLastThrow(db, g.id);
    expect(removed?.seq).toBe(2);
    expect(listThrows(db, g.id)).toHaveLength(1);
  });
  it('undo bei leerem Log -> null', () => {
    const db = openDb(':memory:');
    const g = createGame(db, { gameType: 'x01', options: {}, now: 0 });
    expect(undoLastThrow(db, g.id)).toBeNull();
  });
});
