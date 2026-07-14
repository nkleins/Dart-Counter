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

/** Aktueller Spieler + bereits geworfene Darts im laufenden Zug. */
export function turnCursor(
  turns: Turn[],
  order: string[],
  lastTurnComplete: boolean,
): { currentPlayerId: string | null; dartsThrownThisTurn: number } {
  if (turns.length === 0) {
    return { currentPlayerId: order[0] ?? null, dartsThrownThisTurn: 0 };
  }
  const last = turns[turns.length - 1]!;
  const lastIdx = order.indexOf(last.playerId);
  const curIdx = lastTurnComplete ? (lastIdx + 1) % order.length : lastIdx;
  return {
    currentPlayerId: order[curIdx] ?? null,
    dartsThrownThisTurn: lastTurnComplete ? 0 : last.darts.length,
  };
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
