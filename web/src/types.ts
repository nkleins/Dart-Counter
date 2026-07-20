export type GameType = 'x01' | 'cricket' | 'aroundTheClock';
export interface Dart { segment: number; multiplier: number; }

export interface PlayerMeta { id: string; name: string; order: number; joinedAtRound: number; catchUp: 'catchUp' | 'handicap'; }

export interface X01PlayerState { playerId: string; remaining: number; dartsThrown: number; opened: boolean; finished: boolean; }
export interface X01State { currentPlayerId: string | null; round: number; dartsThrownThisTurn: number; dartsThisTurnTotal: number; finished: boolean; winnerId: string | null; players: X01PlayerState[]; checkout: string[] | null; }

export interface CricketPlayerState { playerId: string; marks: Record<number, number>; score: number; closedAll: boolean; }
export interface CricketState { currentPlayerId: string | null; round: number; dartsThrownThisTurn: number; dartsThisTurnTotal: number; finished: boolean; winnerId: string | null; targets: number[]; deadTargets: number[]; players: CricketPlayerState[]; }

export interface AtcPlayerState { playerId: string; progress: number; target: number | null; finished: boolean; }
export interface AtcState { currentPlayerId: string | null; round: number; dartsThrownThisTurn: number; dartsThisTurnTotal: number; finished: boolean; winnerId: string | null; sequence: number[]; players: AtcPlayerState[]; }

export type AnyState = X01State | CricketState | AtcState;

export type MatchFormat =
  | { kind: 'casual' }
  | { kind: 'singleSet'; legs: 3 | 5 | 7 }
  | { kind: 'match'; sets: 3 | 5 | 7; legs: 3 | 5 | 7 };

export interface MatchSummary {
  format: MatchFormat;
  legsWon: Record<string, number>;
  setsWon: Record<string, number>;
  legNumber: number;
  setNumber: number;
  legWinnerId: string | null;
  setWinnerId: string | null;
  matchWinnerId: string | null;
  finished: boolean;
  averages: Record<string, number> | null;
}

export interface GameView {
  slug: string; gameType: GameType; options: unknown; status: 'lobby' | 'running' | 'finished';
  createdAt: number; expiresAt: number;
  players: PlayerMeta[];
  state: AnyState;
  match: MatchSummary;
  history: { seq: number; playerId: string; segment: number; multiplier: number; round: number; dartNo: number; catchUp: boolean }[];
}
