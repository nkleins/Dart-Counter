import { describe, it, expect } from 'vitest';
import { computeCricketState } from '../cricket.js';
import type { PlayerInput, PlayerDart, CricketOptions } from '../types.js';

const OPTS: CricketOptions = { mode: 'standard', bull: true };
const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });
const marksOf = (s: ReturnType<typeof computeCricketState>, id: string, t: number) =>
  s.players.find(p => p.playerId === id)!.marks[t] ?? 0;

describe('computeCricketState — Marks', () => {
  it('Single auf 20 = 1 Mark', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 20, 1)]);
    expect(marksOf(s, 'a', 20)).toBe(1);
  });
  it('Triple auf 20 = 3 Marks (zu)', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 20, 3)]);
    expect(marksOf(s, 'a', 20)).toBe(3);
    expect(s.players.find(p => p.playerId === 'a')!.closedAll).toBe(false);
  });
  it('Marks deckeln bei 3', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 3)]);
    expect(marksOf(s, 'a', 20)).toBe(3);
  });
  it('Nicht-Ziel (z.B. 3) zählt nicht', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 3, 3)]);
    expect(marksOf(s, 'a', 3)).toBe(0);
  });
  it('Bull ist Ziel, wenn options.bull', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a', 25, 2)]);
    expect(marksOf(s, 'a', 25)).toBe(2);
  });
  it('Rotation: nach 3 Darts ist B dran', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a',20,1), d('a',20,1), d('a',20,1)]);
    expect(s.currentPlayerId).toBe('b');
  });
});

const scoreOf = (s: ReturnType<typeof computeCricketState>, id: string) =>
  s.players.find(p => p.playerId === id)!.score;

describe('computeCricketState — Standard-Punkte', () => {
  it('Overflow punktet, wenn Gegner offen ist', () => {
    // A: T20 (zu) + T20 (3 Overflow-Marks * 20 = 60), B hat 20 offen
    const s = computeCricketState(OPTS, PLAYERS, [d('a',20,3), d('a',20,3)]);
    expect(scoreOf(s, 'a')).toBe(60);
  });
  it('kein Overflow-Punkt beim Schließen selbst', () => {
    const s = computeCricketState(OPTS, PLAYERS, [d('a',20,3)]);
    expect(scoreOf(s, 'a')).toBe(0);
  });
  it('tote Zahl gibt keine Punkte', () => {
    // A schließt 20, B schließt 20 -> 20 tot; A wirft nochmal 20 -> 0 Punkte
    const s = computeCricketState(OPTS, PLAYERS, [
      d('a',20,3), d('a',1,0),            // A: 20 zu (Dart 2 = Miss, segment 1 mult 0)
      d('b',20,3), d('b',1,0),            // B: 20 zu -> 20 ist tot
      d('a',20,3),                        // A: Overflow auf tote 20 -> keine Punkte
    ]);
    expect(s.deadTargets).toContain(20);
    expect(scoreOf(s, 'a')).toBe(0);
  });
  it('Bull-Overflow punktet 25', () => {
    // A: Bull innen (2) + Bull innen (2) => 4 Marks: 3 schließen, 1 Overflow * 25
    const s = computeCricketState(OPTS, PLAYERS, [d('a',25,2), d('a',25,2)]);
    expect(scoreOf(s, 'a')).toBe(25);
  });
});

describe('computeCricketState — Cut-Throat', () => {
  const CT: CricketOptions = { mode: 'cutthroat', bull: true };
  const THREE: PlayerInput[] = [
    { id: 'a', name: 'A', order: 0 },
    { id: 'b', name: 'B', order: 1 },
    { id: 'c', name: 'C', order: 2 },
  ];
  it('Overflow gibt Punkte an alle offenen Gegner', () => {
    // A schließt 20 (T20) und wirft T20 Overflow (3*20=60) -> B und C je +60
    const s = computeCricketState(CT, THREE, [d('a',20,3), d('a',20,3)]);
    expect(s.players.find(p => p.playerId === 'a')!.score).toBe(0);
    expect(s.players.find(p => p.playerId === 'b')!.score).toBe(60);
    expect(s.players.find(p => p.playerId === 'c')!.score).toBe(60);
  });
});

describe('computeCricketState — Sieg', () => {
  it('Standard: alle zu und Punkte vorn = Sieg', () => {
    // A schließt alle Ziele (20..15 + Bull) und liegt bei Punkten nicht hinten
    const darts: PlayerDart[] = [];
    for (const t of [20,19,18,17,16,15]) darts.push(d('a', t, 3));
    darts.push(d('a', 25, 2)); // Bull: 2 Marks
    darts.push(d('a', 25, 2)); // Bull: +2 -> zu (>=3)
    const s = computeCricketState(OPTS, PLAYERS, darts);
    expect(s.players.find(p => p.playerId === 'a')!.closedAll).toBe(true);
    expect(s.finished).toBe(true);
    expect(s.winnerId).toBe('a');
    expect(s.currentPlayerId).toBe(null);
    // 8 Darts von 'a' (Cap 3 pro Zug) => 3 Züge => bei 2 Spielern Runde 2 (konsistent zu x01/atc).
    expect(s.round).toBe(2);
  });

  it('Standard: alle zu aber Gegner führt = noch kein Sieg', () => {
    // B macht erst Punkte (schließt 20, Overflow gegen offenes A), dann schließt A alles,
    // liegt aber Punkte-technisch hinten -> kein Sieg
    const darts: PlayerDart[] = [
      d('b',20,3), d('b',20,3), d('b',20,3),   // B: 20 zu + 6 Overflow-Marks*20 = 120 Punkte
      // A schließt nun alles:
      d('a',20,3), d('a',19,3), d('a',18,3),
      d('a',17,3), d('a',16,3), d('a',15,3),
      d('a',25,2), d('a',25,2),                // Bull zu
    ];
    const s = computeCricketState(OPTS, PLAYERS, darts);
    expect(s.players.find(p => p.playerId === 'a')!.closedAll).toBe(true);
    expect(s.finished).toBe(false); // A liegt bei Punkten hinten (0 < 120)
  });
});
