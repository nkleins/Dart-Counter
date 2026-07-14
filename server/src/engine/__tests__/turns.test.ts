import { describe, it, expect } from 'vitest';
import { groupTurns, turnCursor, roundFor } from '../turns.js';
import type { PlayerDart } from '../types.js';

const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });

describe('groupTurns', () => {
  it('gruppiert aufeinanderfolgende Würfe desselben Spielers, max 3', () => {
    const turns = groupTurns([d('a',1,1), d('a',1,1), d('a',1,1), d('a',1,1), d('b',1,1)]);
    expect(turns.map(t => [t.playerId, t.darts.length])).toEqual([['a',3],['a',1],['b',1]]);
  });
});

describe('groupTurns — Erstzug-Cap (Aufholen)', () => {
  it('erster Zug fasst bis firstTurnDarts, danach 3', () => {
    const caps = new Map<string, number>([['a', 6]]);
    // a wirft 8 Darts hintereinander -> Zug1 (6) + Zug2 (2)
    const darts = Array.from({ length: 8 }, () => d('a', 1, 1));
    const turns = groupTurns(darts, caps);
    expect(turns.map((t) => t.darts.length)).toEqual([6, 2]);
    expect(turns[0]!.cap).toBe(6);
    expect(turns[1]!.cap).toBe(3);
  });
  it('ohne Cap bleibt es bei 3', () => {
    const darts = Array.from({ length: 4 }, () => d('a', 1, 1));
    const turns = groupTurns(darts);
    expect(turns.map((t) => t.darts.length)).toEqual([3, 1]);
    expect(turns[0]!.cap).toBe(3);
  });
});

describe('turnCursor', () => {
  it('leeres Spiel: erster Spieler, 0 Darts', () => {
    expect(turnCursor([], ['a','b'], true)).toEqual({ currentPlayerId: 'a', dartsThrownThisTurn: 0 });
  });
  it('unvollständiger letzter Zug: selber Spieler', () => {
    const turns = groupTurns([d('a',1,1), d('a',1,1)]);
    expect(turnCursor(turns, ['a','b'], false)).toEqual({ currentPlayerId: 'a', dartsThrownThisTurn: 2 });
  });
  it('abgeschlossener letzter Zug: nächster Spieler', () => {
    const turns = groupTurns([d('a',1,1), d('a',1,1), d('a',1,1)]);
    expect(turnCursor(turns, ['a','b'], true)).toEqual({ currentPlayerId: 'b', dartsThrownThisTurn: 0 });
  });
});
