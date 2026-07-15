import type { PlayerDart } from './types.js';

export interface Turn {
  playerId: string;
  darts: PlayerDart[];
  cap: number;
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
