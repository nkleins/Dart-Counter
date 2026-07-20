import { describe, it, expect } from 'vitest';
import { computeX01State } from '../x01.js';
import type { PlayerInput, PlayerDart, X01Options } from '../types.js';

const OPTS: X01Options = { start: 501, in: 'straight', out: 'straight' };
const PLAYERS: PlayerInput[] = [
  { id: 'a', name: 'A', order: 0 },
  { id: 'b', name: 'B', order: 1 },
];
const d = (playerId: string, segment: number, multiplier: number): PlayerDart => ({ playerId, segment, multiplier });

describe('computeX01State — Grundlagen', () => {
  it('leeres Spiel: A ist dran, Runde 1, voller Startwert', () => {
    const s = computeX01State(OPTS, PLAYERS, []);
    expect(s.currentPlayerId).toBe('a');
    expect(s.round).toBe(1);
    expect(s.dartsThrownThisTurn).toBe(0);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(501);
  });

  it('zieht Punkte ab und bleibt beim selben Spieler bis 3 Darts', () => {
    const s = computeX01State(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 1)]);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(501 - 80);
    expect(s.currentPlayerId).toBe('a');
    expect(s.dartsThrownThisTurn).toBe(2);
  });

  it('wechselt nach 3 Darts zu B', () => {
    const s = computeX01State(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 3), d('a', 20, 3)]);
    expect(s.currentPlayerId).toBe('b');
    expect(s.dartsThrownThisTurn).toBe(0);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(501 - 180);
  });

  it('Runde erhöht sich, wenn A wieder dran ist', () => {
    const darts = [
      d('a', 1, 1), d('a', 1, 1), d('a', 1, 1),
      d('b', 1, 1), d('b', 1, 1), d('b', 1, 1),
    ];
    const s = computeX01State(OPTS, PLAYERS, darts);
    expect(s.currentPlayerId).toBe('a');
    expect(s.round).toBe(2);
  });
});

describe('computeX01State — Bust', () => {
  const OPTS2: X01Options = { start: 50, in: 'straight', out: 'straight' };

  it('Überwerfen macht die Aufnahme ungültig, Nächster ist dran', () => {
    // A hat 50, wirft T20 (60) -> unter 0 -> Bust, Rest bleibt 50
    const s = computeX01State(OPTS2, PLAYERS, [d('a', 20, 3)]);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(50);
    expect(s.currentPlayerId).toBe('b');
    expect(s.dartsThrownThisTurn).toBe(0);
  });

  it('Bust erst durch den 2. Dart: 1. Dart wird ebenfalls verworfen', () => {
    // A hat 50: Dart1 20 (->30), Dart2 T20 (60 -> unter 0) -> Bust, Rest bleibt 50
    const s = computeX01State(OPTS2, PLAYERS, [d('a', 20, 1), d('a', 20, 3)]);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(50);
    expect(s.currentPlayerId).toBe('b');
  });
});

describe('computeX01State — In/Out + Sieg', () => {
  it('straight-out: Rest 0 gewinnt', () => {
    const o: X01Options = { start: 40, in: 'straight', out: 'straight' };
    const s = computeX01State(o, PLAYERS, [d('a', 20, 2)]); // 40 -> 0
    expect(s.finished).toBe(true);
    expect(s.winnerId).toBe('a');
    expect(s.currentPlayerId).toBe(null);
    expect(s.players.find(p => p.playerId === 'a')!.finished).toBe(true);
  });

  it('double-out: Rest 0 ohne Double ist Bust', () => {
    const o: X01Options = { start: 40, in: 'straight', out: 'double' };
    const s = computeX01State(o, PLAYERS, [d('a', 20, 1), d('a', 20, 1)]); // 40->20->0 aber letzter kein Double
    expect(s.finished).toBe(false);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(40); // Bust, zurück auf Zug-Beginn
    expect(s.currentPlayerId).toBe('b');
  });

  it('double-out: Rest 0 mit Double gewinnt', () => {
    const o: X01Options = { start: 40, in: 'straight', out: 'double' };
    const s = computeX01State(o, PLAYERS, [d('a', 20, 2)]); // D20 -> 0
    expect(s.finished).toBe(true);
    expect(s.winnerId).toBe('a');
  });

  it('double-out: Rest 1 ist Bust', () => {
    const o: X01Options = { start: 3, in: 'straight', out: 'double' };
    const s = computeX01State(o, PLAYERS, [d('a', 2, 1)]); // 3 -> 1 -> Bust
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(3);
    expect(s.currentPlayerId).toBe('b');
  });

  it('double-in: Darts vor dem ersten Double zählen nicht', () => {
    const o: X01Options = { start: 100, in: 'double', out: 'straight' };
    // Dart1 S20 zählt nicht (noch nicht eröffnet), Dart2 D10 eröffnet und zählt (-20)
    const s = computeX01State(o, PLAYERS, [d('a', 20, 1), d('a', 10, 2)]);
    expect(s.players.find(p => p.playerId === 'a')!.remaining).toBe(80);
  });
});

describe('computeX01State — Undo als reine Funktion', () => {
  it('Zustand nach Undo = Zustand ohne den letzten Dart', () => {
    const darts: PlayerDart[] = [d('a', 20, 3), d('a', 20, 3), d('a', 20, 3), d('b', 20, 1)];
    const afterUndo = computeX01State(OPTS, PLAYERS, darts.slice(0, -1));
    const rebuilt = computeX01State(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 3), d('a', 20, 3)]);
    expect(afterUndo).toEqual(rebuilt);
    expect(afterUndo.currentPlayerId).toBe('b');
    expect(afterUndo.dartsThrownThisTurn).toBe(0);
  });

  it('Undo über Spielerwechsel hinweg springt zurück zu A', () => {
    // A komplett (3 Darts) + B ein Dart; Undo des B-Darts -> B ist dran mit 0 Darts
    const darts: PlayerDart[] = [d('a', 5, 1), d('a', 5, 1), d('a', 5, 1), d('b', 5, 1)];
    const undone = computeX01State(OPTS, PLAYERS, darts.slice(0, -1));
    expect(undone.currentPlayerId).toBe('b');
    expect(undone.dartsThrownThisTurn).toBe(0);
  });
});

describe('computeX01State — Aufnahme-Punkte (turnPoints)', () => {
  it('laufende Aufnahme summiert die Punkte der aktiven Person', () => {
    // A: T20 (60) + S20 (20) -> 2/3 Darts, Aufnahme läuft -> turnPoints 80
    const s = computeX01State(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 1)]);
    expect(s.turnPoints).toBe(80);
    expect(s.currentPlayerId).toBe('a');
  });

  it('nach abgeschlossener Aufnahme (3 Darts) ist die nächste Person mit 0 dran', () => {
    const s = computeX01State(OPTS, PLAYERS, [d('a', 20, 3), d('a', 20, 3), d('a', 20, 3)]);
    expect(s.currentPlayerId).toBe('b');
    expect(s.turnPoints).toBe(0);
  });

  it('Bust setzt die Aufnahme-Punkte zurück (0)', () => {
    const o: X01Options = { start: 50, in: 'straight', out: 'straight' };
    const s = computeX01State(o, PLAYERS, [d('a', 20, 3)]); // 60 > 50 -> Bust
    expect(s.turnPoints).toBe(0);
    expect(s.currentPlayerId).toBe('b');
  });

  it('leeres Spiel: turnPoints 0', () => {
    const s = computeX01State(OPTS, PLAYERS, []);
    expect(s.turnPoints).toBe(0);
  });
});

describe('computeX01State — Aufholen (firstTurnDarts)', () => {
  it('Aufhol-Spieler wirft 6 Darts in einem Zug', () => {
    const players: PlayerInput[] = [
      { id: 'a', name: 'A', order: 0, firstTurnDarts: 6 },
      { id: 'b', name: 'B', order: 1 },
    ];
    // A wirft 6x S20 (=120) am Stück -> ein Zug, danach B
    const darts: PlayerDart[] = Array.from({ length: 6 }, () => d('a', 20, 1));
    const s = computeX01State(OPTS, players, darts);
    expect(s.players.find((p) => p.playerId === 'a')!.remaining).toBe(501 - 120);
    expect(s.currentPlayerId).toBe('b');
    expect(s.dartsThrownThisTurn).toBe(0);
  });
});
