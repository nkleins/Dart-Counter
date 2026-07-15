import type { AtcOptions, PlayerDart, PlayerInput } from './types.js';
import { groupTurns, turnCursor, roundFor } from './turns.js';

export interface AtcPlayerState {
  playerId: string;
  progress: number;      // 0..21 abgeschlossene Ziele
  target: number | null; // nächstes Ziel oder null
  finished: boolean;
}

export interface AtcState {
  currentPlayerId: string | null;
  round: number;
  dartsThrownThisTurn: number;
  dartsThisTurnTotal: number;
  finished: boolean;
  winnerId: string | null;
  sequence: number[];
  players: AtcPlayerState[];
}

const SEQUENCE = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,25];

export function computeAtcState(
  options: AtcOptions,
  players: PlayerInput[],
  darts: PlayerDart[],
): AtcState {
  const order = [...players].sort((a, b) => a.order - b.order).map((p) => p.id);
  const progress = new Map<string, number>(players.map((p) => [p.id, 0]));

  const firstTurnDarts = new Map(players.filter((p) => p.firstTurnDarts).map((p) => [p.id, p.firstTurnDarts!]));
  const turns = groupTurns(darts, firstTurnDarts);
  let winnerId: string | null = null;
  let lastTurnComplete = true;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    if (winnerId || !progress.has(turn.playerId)) continue;
    let prog = progress.get(turn.playerId)!;
    for (const dart of turn.darts) {
      const targetNumber = SEQUENCE[prog];
      if (targetNumber !== undefined && dart.segment === targetNumber && dart.multiplier > 0) {
        const step = options.advanceByMultiplier ? dart.multiplier : 1;
        prog = Math.min(SEQUENCE.length, prog + step);
      }
      if (prog >= SEQUENCE.length) { winnerId = turn.playerId; break; }
    }
    progress.set(turn.playerId, prog);
    if (i === turns.length - 1) lastTurnComplete = winnerId === turn.playerId || turn.darts.length >= turn.cap;
  }

  const players_out: AtcPlayerState[] = order.map((id) => {
    const prog = progress.get(id)!;
    const finished = prog >= SEQUENCE.length;
    return { playerId: id, progress: prog, target: finished ? null : SEQUENCE[prog]!, finished };
  });

  if (winnerId) {
    return {
      currentPlayerId: null,
      round: Math.max(1, Math.ceil(turns.length / Math.max(1, order.length))),
      dartsThrownThisTurn: 0,
      dartsThisTurnTotal: 0,
      finished: true,
      winnerId,
      sequence: SEQUENCE,
      players: players_out,
    };
  }
  const { currentPlayerId, dartsThrownThisTurn, dartsThisTurnTotal } = turnCursor(turns, order, lastTurnComplete, firstTurnDarts);
  const round = currentPlayerId ? roundFor(turns, order, currentPlayerId, lastTurnComplete) : 1;
  return { currentPlayerId, round, dartsThrownThisTurn, dartsThisTurnTotal, finished: false, winnerId: null, sequence: SEQUENCE, players: players_out };
}
