import type { PlayerDart, PlayerInput } from './types.js';

export interface Turn {
  playerId: string;
  darts: PlayerDart[];
  cap: number;
}

/** Spieler-IDs in Zug-Reihenfolge (nach `order` sortiert). */
export function playerOrder(players: PlayerInput[]): string[] {
  return [...players].sort((a, b) => a.order - b.order).map((p) => p.id);
}

/** Map der Erst-Zug-Längen (nur Spieler*innen mit abweichender Länge, z. B. Aufholen). */
export function firstTurnDartsMap(players: PlayerInput[]): Map<string, number> {
  return new Map(players.filter((p) => p.firstTurnDarts).map((p) => [p.id, p.firstTurnDarts!]));
}

export function groupTurns(darts: PlayerDart[], firstTurnDarts: Map<string, number> = new Map()): Turn[] {
  const turns: Turn[] = [];
  const started = new Set<string>();
  for (const dart of darts) {
    const last = turns[turns.length - 1];
    if (last && last.playerId === dart.playerId && last.darts.length < last.cap) {
      last.darts.push(dart);
    } else {
      const isFirst = !started.has(dart.playerId);
      started.add(dart.playerId);
      const cap = isFirst ? (firstTurnDarts.get(dart.playerId) ?? 3) : 3;
      turns.push({ playerId: dart.playerId, darts: [dart], cap });
    }
  }
  return turns;
}

/**
 * Aktueller Spieler + bereits geworfene Darts im laufenden Zug + die Gesamtzahl
 * der in diesem Zug zu werfenden Darts (`dartsThisTurnTotal`). Normalerweise 3,
 * beim Aufhol-Erstzug entsprechend größer (firstTurnDarts).
 */
export function turnCursor(
  turns: Turn[],
  order: string[],
  lastTurnComplete: boolean,
  firstTurnDarts: Map<string, number> = new Map(),
): { currentPlayerId: string | null; dartsThrownThisTurn: number; dartsThisTurnTotal: number } {
  // Cap für einen *neu* beginnenden Zug: erster Zug des Spielers -> firstTurnDarts, sonst 3.
  const capForNewTurn = (playerId: string | null): number => {
    if (!playerId) return 3;
    const started = turns.some((t) => t.playerId === playerId);
    return started ? 3 : (firstTurnDarts.get(playerId) ?? 3);
  };

  if (turns.length === 0) {
    const current = order[0] ?? null;
    return { currentPlayerId: current, dartsThrownThisTurn: 0, dartsThisTurnTotal: capForNewTurn(current) };
  }
  const last = turns[turns.length - 1]!;
  const lastIdx = order.indexOf(last.playerId);
  const curIdx = lastTurnComplete ? (lastIdx + 1) % order.length : lastIdx;
  const current = order[curIdx] ?? null;
  if (!lastTurnComplete) {
    // Laufender Zug ist `last` – Cap ist bereits bekannt.
    return { currentPlayerId: current, dartsThrownThisTurn: last.darts.length, dartsThisTurnTotal: last.cap };
  }
  return { currentPlayerId: current, dartsThrownThisTurn: 0, dartsThisTurnTotal: capForNewTurn(current) };
}

/** Runde des aktuellen Spielers = abgeschlossene Züge dieses Spielers + 1. */
export function roundFor(turns: Turn[], order: string[], currentPlayerId: string, lastComplete: boolean): number {
  let completed = 0;
  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]!;
    const isLast = i === turns.length - 1;
    const complete = !isLast || lastComplete;
    if (t.playerId === currentPlayerId && complete) completed += 1;
  }
  return completed + 1;
}

/** Runde ohne aktuellen Spieler (Spiel beendet/leer): aus Gesamtzahl der Züge herleiten. */
function winnerRound(turnCount: number, playerCount: number): number {
  return Math.max(1, Math.ceil(turnCount / Math.max(1, playerCount)));
}

/**
 * Der öffentliche Zug-Teil des Spielzustands (aktueller Spieler, Runde, Darts im Zug) —
 * identisch für x01, Cricket und Around-the-Clock. Bei Sieg gibt es keinen aktiven
 * Spieler mehr; die Runde wird dann aus der Gesamtzahl der Züge hergeleitet.
 */
export function publicTurnState(
  turns: Turn[],
  order: string[],
  winnerId: string | null,
  lastTurnComplete: boolean,
  firstTurnDarts: Map<string, number> = new Map(),
): { currentPlayerId: string | null; round: number; dartsThrownThisTurn: number; dartsThisTurnTotal: number } {
  if (winnerId) {
    return { currentPlayerId: null, round: winnerRound(turns.length, order.length), dartsThrownThisTurn: 0, dartsThisTurnTotal: 0 };
  }
  const cursor = turnCursor(turns, order, lastTurnComplete, firstTurnDarts);
  const round = cursor.currentPlayerId
    ? roundFor(turns, order, cursor.currentPlayerId, lastTurnComplete)
    : winnerRound(turns.length, order.length);
  return { currentPlayerId: cursor.currentPlayerId, round, dartsThrownThisTurn: cursor.dartsThrownThisTurn, dartsThisTurnTotal: cursor.dartsThisTurnTotal };
}
