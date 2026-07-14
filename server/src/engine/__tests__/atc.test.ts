import { describe, it, expect } from 'vitest';
import { computeAtcState } from '../atc.js';
import type { PlayerInput, PlayerDart, AtcOptions } from '../types.js';

const OPTS: AtcOptions = { advanceByMultiplier: true };
const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });
const pa = (s: ReturnType<typeof computeAtcState>, id: string) => s.players.find(p => p.playerId === id)!;

describe('computeAtcState', () => {
  it('Start: Ziel ist 1, progress 0', () => {
    const s = computeAtcState(OPTS, PLAYERS, []);
    expect(pa(s, 'a').target).toBe(1);
    expect(pa(s, 'a').progress).toBe(0);
  });
  it('Treffer aufs Ziel rückt vor', () => {
    const s = computeAtcState(OPTS, PLAYERS, [d('a', 1, 1)]);
    expect(pa(s, 'a').progress).toBe(1);
    expect(pa(s, 'a').target).toBe(2);
  });
  it('falsche Zahl rückt nicht vor', () => {
    const s = computeAtcState(OPTS, PLAYERS, [d('a', 5, 1)]);
    expect(pa(s, 'a').progress).toBe(0);
  });
  it('Triple des Ziels rückt 3 vor (advanceByMultiplier)', () => {
    const s = computeAtcState(OPTS, PLAYERS, [d('a', 1, 3)]);
    expect(pa(s, 'a').progress).toBe(3);
    expect(pa(s, 'a').target).toBe(4);
  });
  it('ohne advanceByMultiplier rückt nur 1 vor', () => {
    const s = computeAtcState({ advanceByMultiplier: false }, PLAYERS, [d('a', 1, 3)]);
    expect(pa(s, 'a').progress).toBe(1);
  });
  it('Bull am Ende beendet -> Sieg', () => {
    const darts: PlayerDart[] = [];
    // 1..20 je Single (aber max 3 Darts/Zug -> Rotation nötig). Vereinfachung: nur A wirft,
    // Rotation ignoriert Reihenfolge nicht — daher fülle B-Züge mit Misses.
    let count = 0;
    const push = (seg: number, mult: number) => {
      darts.push(d('a', seg, mult)); count++;
      if (count % 3 === 0) { darts.push(d('b',0,0), d('b',0,0), d('b',0,0)); }
    };
    for (let n = 1; n <= 20; n++) push(n, 1);
    push(25, 1); // Bull -> fertig
    const s = computeAtcState(OPTS, PLAYERS, darts);
    expect(pa(s, 'a').finished).toBe(true);
    expect(s.winnerId).toBe('a');
    expect(s.finished).toBe(true);
  });
});
