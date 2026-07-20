import { describe, it, expect } from 'vitest';
import { computeMatchState } from '../match.js';
import type { PlayerInput, PlayerDart } from '../types.js';

const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });

// x01 mit Start 60, straight out: ein T20 (60) gewinnt ein Leg in EINEM Dart.
const X01 = (format: unknown) => ({ start: 60, in: 'straight', out: 'straight', format });
const win = (p: string) => d(p, 20, 3); // 60 -> Leg gewonnen

describe('computeMatchState — casual', () => {
  it('verhält sich wie ein einzelnes Leg', () => {
    const r = computeMatchState('x01', X01({ kind: 'casual' }), PLAYERS, [win('a')]);
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
    expect(r.leg.state.winnerId).toBe('a');
  });

  it('leeres Spiel: A ist dran, nichts gewonnen', () => {
    const r = computeMatchState('x01', X01({ kind: 'casual' }), PLAYERS, []);
    expect(r.match.finished).toBe(false);
    expect(r.leg.state.currentPlayerId).toBe('a');
  });
});

describe('computeMatchState — singleSet Best of 3 Legs', () => {
  const F = { kind: 'singleSet', legs: 3 };

  it('nach einem gewonnenen Leg: Zähler 1:0, Banner an A, Match läuft weiter', () => {
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a')]);
    expect(r.match.legsWon).toEqual({ a: 1, b: 0 });
    expect(r.match.finished).toBe(false);
    expect(r.match.legWinnerId).toBe('a');       // an der Leg-Grenze
    // Leg 2 startet mit B (Rotation um 1)
    expect(r.leg.state.currentPlayerId).toBe('b');
  });

  it('Banner verschwindet, sobald im nächsten Leg geworfen wird', () => {
    // A gewinnt Leg 1, dann wirft B im Leg 2 einen (nicht gewinnenden) Dart.
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), d('b', 1, 1)]);
    expect(r.match.legWinnerId).toBe(null);
    expect(r.match.legsWon).toEqual({ a: 1, b: 0 });
  });

  it('erste*r auf 2 Legs gewinnt das Match (Rotation: Leg1 A-Start, Leg2 B-Start)', () => {
    // Leg 1: A gewinnt. Leg 2 startet B -> B soll auch hier gewinnen: also wirft B.
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('b'), win('a')]);
    // Leg1 A, Leg2 B, Leg3 (Start A) A -> A hat 2 Legs
    expect(r.match.legsWon).toEqual({ a: 2, b: 1 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
    expect(r.match.legWinnerId).toBe(null); // bei Match-Ende kein Banner
  });
});

describe('computeMatchState — match Best of 3 Sets × Best of 3 Legs', () => {
  const F = { kind: 'match', sets: 3, legs: 3 };

  it('2 Legs gewinnen ein Set, danach werden legsWon zurückgesetzt', () => {
    // Set 1: Leg1 Start A -> A, Leg2 Start B -> A (A wirft), A hat 2 Legs -> Set an A
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('a')]);
    expect(r.match.setsWon).toEqual({ a: 1, b: 0 });
    expect(r.match.legsWon).toEqual({ a: 0, b: 0 }); // neues Set
    expect(r.match.finished).toBe(false);
  });

  it('2 Sets gewinnen das Match', () => {
    // Set1: A,A (2 Legs) ; Set2: A,A (2 Legs) -> A gewinnt Match
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('a'), win('a'), win('a')]);
    expect(r.match.setsWon).toEqual({ a: 2, b: 0 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
  });

  it('an einer Set-Grenze zeigt setWinnerId den Set-Sieger, an einer reinen Leg-Grenze bleibt es null', () => {
    // Leg1 (Start A) -> A gewinnt: reine Leg-Grenze, kein Set-Ende.
    const afterLeg1 = computeMatchState('x01', X01(F), PLAYERS, [win('a')]);
    expect(afterLeg1.match.legWinnerId).toBe('a');
    expect(afterLeg1.match.setWinnerId).toBe(null);

    // Leg2 (Start B, A wirft) -> A gewinnt auch Leg 2 -> Set an A (2 Legs).
    const afterSet = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('a')]);
    expect(afterSet.match.legWinnerId).toBe('a');
    expect(afterSet.match.setWinnerId).toBe('a');
  });
});

describe('computeMatchState — Undo über Leg-Grenze (reine Funktion)', () => {
  const F = { kind: 'singleSet', legs: 3 };
  it('Weglassen des Sieg-Darts macht das Leg wieder laufend', () => {
    const full = computeMatchState('x01', X01(F), PLAYERS, [win('a')]);
    expect(full.match.legsWon).toEqual({ a: 1, b: 0 });
    const undone = computeMatchState('x01', X01(F), PLAYERS, []);
    expect(undone.match.legsWon).toEqual({ a: 0, b: 0 });
    expect(undone.leg.state.currentPlayerId).toBe('a');
  });
});

describe('computeMatchState — Rotation über 3 Spieler*innen', () => {
  const P3: PlayerInput[] = [
    { id: 'a', name: 'A', order: 0 },
    { id: 'b', name: 'B', order: 1 },
    { id: 'c', name: 'C', order: 2 },
  ];
  const F = { kind: 'singleSet', legs: 3 };

  it('Start-Person rotiert pro Leg: a → b → c', () => {
    // Leg 1 (Start a): a gewinnt -> Leg 2 startet b (Rotation um 1)
    const afterLeg1 = computeMatchState('x01', X01(F), P3, [win('a')]);
    expect(afterLeg1.match.legWinnerId).toBe('a');
    expect(afterLeg1.match.legsWon).toEqual({ a: 1, b: 0, c: 0 });
    expect(afterLeg1.leg.state.currentPlayerId).toBe('b');

    // Leg 2 (Start b): b gewinnt -> Leg 3 startet c (Rotation um 2)
    const afterLeg2 = computeMatchState('x01', X01(F), P3, [win('a'), win('b')]);
    expect(afterLeg2.match.legsWon).toEqual({ a: 1, b: 1, c: 0 });
    expect(afterLeg2.leg.state.currentPlayerId).toBe('c');
  });

  it('3-Spieler-Tally und Match-Ende (erste*r auf 2 Legs)', () => {
    const r = computeMatchState('x01', X01(F), P3, [win('a'), win('b'), win('a')]);
    expect(r.match.legsWon).toEqual({ a: 2, b: 1, c: 0 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
  });
});

describe('computeMatchState — Cricket als Leg-Typ', () => {
  // Cricket standard, Bull aus -> Ziele [20,19,18,17,16,15]; 6 Triples schließen alle
  // (Score 0 = Maximum) und gewinnen das Leg.
  const CRICKET = (format: unknown) => ({ mode: 'standard', bull: false, format });
  const cWin = (p: string): PlayerDart[] => [20, 19, 18, 17, 16, 15].map((t) => d(p, t, 3));
  const F = { kind: 'singleSet', legs: 3 };

  it('ein Cricket-Leg wird gezählt, das nächste startet frisch', () => {
    const r = computeMatchState('cricket', CRICKET(F), PLAYERS, cWin('a'));
    expect(r.match.legsWon).toEqual({ a: 1, b: 0 });
    expect(r.match.legWinnerId).toBe('a');
    expect(r.match.finished).toBe(false);
    // Leg 2 startet mit B, frisches Board
    expect(r.leg.state.currentPlayerId).toBe('b');
    expect(r.leg.state.finished).toBe(false);
  });

  it('Best of 3: a gewinnt 2:1', () => {
    const r = computeMatchState('cricket', CRICKET(F), PLAYERS, [...cWin('a'), ...cWin('b'), ...cWin('a')]);
    expect(r.match.legsWon).toEqual({ a: 2, b: 1 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
  });
});

describe('computeMatchState — Around the Clock als Leg-Typ', () => {
  // advanceByMultiplier: ein Triple des Ziels rückt 3 vor. Sequenz 1..20,Bull (21 Ziele);
  // 7 gezielte Triples (T1,T4,T7,T10,T13,T16,T19) gewinnen ein Leg.
  const ATC = (format: unknown) => ({ advanceByMultiplier: true, format });
  const aWin = (p: string): PlayerDart[] => [1, 4, 7, 10, 13, 16, 19].map((t) => d(p, t, 3));
  const F = { kind: 'singleSet', legs: 3 };

  it('ein ATC-Leg wird gezählt, das nächste startet frisch', () => {
    const r = computeMatchState('aroundTheClock', ATC(F), PLAYERS, aWin('a'));
    expect(r.match.legsWon).toEqual({ a: 1, b: 0 });
    expect(r.match.legWinnerId).toBe('a');
    expect(r.match.finished).toBe(false);
    expect(r.leg.state.currentPlayerId).toBe('b');
    expect(r.leg.state.finished).toBe(false);
  });

  it('Best of 3: a gewinnt 2:1', () => {
    const r = computeMatchState('aroundTheClock', ATC(F), PLAYERS, [...aWin('a'), ...aWin('b'), ...aWin('a')]);
    expect(r.match.legsWon).toEqual({ a: 2, b: 1 });
    expect(r.match.finished).toBe(true);
    expect(r.match.matchWinnerId).toBe('a');
  });
});

describe('computeMatchState — legNumber/setNumber', () => {
  const F = { kind: 'match', sets: 3, legs: 3 };

  it('frisch: Leg 1, Set 1', () => {
    const r = computeMatchState('x01', X01(F), PLAYERS, []);
    expect(r.match.legNumber).toBe(1);
    expect(r.match.setNumber).toBe(1);
  });

  it('nach 1 gewonnenem Leg (kein Set-Ende): Leg 2, Set 1', () => {
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a')]);
    expect(r.match.legNumber).toBe(2);
    expect(r.match.setNumber).toBe(1);
  });

  it('nach gewonnenem Set (2 Legs): Leg 1, Set 2', () => {
    const r = computeMatchState('x01', X01(F), PLAYERS, [win('a'), win('a')]);
    expect(r.match.setNumber).toBe(2);
    expect(r.match.legNumber).toBe(1);
  });

  it('singleSet: setNumber bleibt 1', () => {
    const r = computeMatchState('x01', X01({ kind: 'singleSet', legs: 3 }), PLAYERS, [win('a')]);
    expect(r.match.setNumber).toBe(1);
    expect(r.match.legNumber).toBe(2);
  });
});
