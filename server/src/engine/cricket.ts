import type { CricketOptions, PlayerDart, PlayerInput } from './types.js';
import { groupTurns, turnCursor, roundFor } from './turns.js';

export interface CricketPlayerState {
  playerId: string;
  marks: Record<number, number>;
  score: number;
  closedAll: boolean;
}

export interface CricketState {
  currentPlayerId: string | null;
  round: number;
  dartsThrownThisTurn: number;
  dartsThisTurnTotal: number;
  finished: boolean;
  winnerId: string | null;
  targets: number[];
  deadTargets: number[];
  players: CricketPlayerState[];
}

const BASE_TARGETS = [20, 19, 18, 17, 16, 15];

export function cricketTargets(options: CricketOptions): number[] {
  return options.bull ? [...BASE_TARGETS, 25] : [...BASE_TARGETS];
}

export function computeCricketState(
  options: CricketOptions,
  players: PlayerInput[],
  darts: PlayerDart[],
): CricketState {
  const targets = cricketTargets(options);
  const order = [...players].sort((a, b) => a.order - b.order).map((p) => p.id);
  const ps = new Map<string, CricketPlayerState>(
    players.map((p) => [p.id, { playerId: p.id, marks: {}, score: 0, closedAll: false }]),
  );

  const firstTurnDarts = new Map(players.filter((p) => p.firstTurnDarts).map((p) => [p.id, p.firstTurnDarts!]));
  const turns = groupTurns(darts, firstTurnDarts);
  let winnerId: string | null = null;
  let lastTurnComplete = true;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const state = ps.get(turn.playerId);
    if (!state || winnerId) continue;

    for (const dart of turn.darts) {
      if (!targets.includes(dart.segment)) continue;
      const t = dart.segment;
      const value = t === 25 ? 25 : t;
      const marks = dart.multiplier;
      const cur = state.marks[t] ?? 0;
      const closing = Math.min(marks, 3 - cur);
      state.marks[t] = cur + closing;
      const overflow = marks - closing;
      if (overflow > 0) {
        const someOpponentOpen = order.some((id) => id !== turn.playerId && (ps.get(id)!.marks[t] ?? 0) < 3);
        if (options.mode === 'standard') {
          if (someOpponentOpen) state.score += overflow * value;
        } else {
          for (const id of order) {
            if (id === turn.playerId) continue;
            const opp = ps.get(id)!;
            if ((opp.marks[t] ?? 0) < 3) opp.score += overflow * value;
          }
        }
      }
      if (hasWon(options, state, ps, targets)) { winnerId = turn.playerId; break; }
    }

    if (i === turns.length - 1) lastTurnComplete = winnerId === turn.playerId || turn.darts.length >= turn.cap;
  }

  const players_out = order.map((id) => {
    const st = ps.get(id)!;
    st.closedAll = targets.every((t) => (st.marks[t] ?? 0) >= 3);
    return st;
  });
  const deadTargets = targets.filter((t) => players_out.every((p) => (p.marks[t] ?? 0) >= 3));

  const cursor = turnCursor(turns, order, lastTurnComplete, firstTurnDarts);
  const currentPlayerId = winnerId ? null : cursor.currentPlayerId;
  const dartsThrownThisTurn = winnerId ? 0 : cursor.dartsThrownThisTurn;
  const dartsThisTurnTotal = winnerId ? 0 : cursor.dartsThisTurnTotal;
  const round = currentPlayerId
    ? roundFor(turns, order, currentPlayerId, lastTurnComplete)
    : Math.max(1, Math.ceil(turns.length / Math.max(1, order.length)));

  return {
    currentPlayerId,
    round,
    dartsThrownThisTurn,
    dartsThisTurnTotal,
    finished: winnerId !== null,
    winnerId,
    targets,
    deadTargets,
    players: players_out,
  };
}

function hasWon(
  options: CricketOptions,
  player: CricketPlayerState,
  ps: Map<string, CricketPlayerState>,
  targets: number[],
): boolean {
  const closedAll = targets.every((t) => (player.marks[t] ?? 0) >= 3);
  if (!closedAll) return false;
  const scores = [...ps.values()].map((p) => p.score);
  return options.mode === 'standard'
    ? player.score >= Math.max(...scores)
    : player.score <= Math.min(...scores);
}
