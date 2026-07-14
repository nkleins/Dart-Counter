import type { GameType, PlayerDart, PlayerInput, X01Options, CricketOptions, AtcOptions } from './types.js';
import { computeX01State, type X01State } from './x01.js';
import { computeCricketState, type CricketState } from './cricket.js';
import { computeAtcState, type AtcState } from './atc.js';

export type { GameType } from './types.js';

export type GameStateResult =
  | { gameType: 'x01'; state: X01State }
  | { gameType: 'cricket'; state: CricketState }
  | { gameType: 'aroundTheClock'; state: AtcState };

export function computeGameState(
  gameType: GameType,
  options: unknown,
  players: PlayerInput[],
  darts: PlayerDart[],
): GameStateResult {
  switch (gameType) {
    case 'x01':
      return { gameType, state: computeX01State(options as X01Options, players, darts) };
    case 'cricket':
      return { gameType, state: computeCricketState(options as CricketOptions, players, darts) };
    case 'aroundTheClock':
      return { gameType, state: computeAtcState(options as AtcOptions, players, darts) };
  }
}

export function currentPlayerId(result: GameStateResult): string | null {
  return result.state.currentPlayerId;
}

export function isFinished(result: GameStateResult): { finished: boolean; winnerId: string | null } {
  return { finished: result.state.finished, winnerId: result.state.winnerId };
}
