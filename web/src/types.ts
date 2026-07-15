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

export interface GameView {
  slug: string; gameType: GameType; options: unknown; status: 'lobby' | 'running' | 'finished';
  createdAt: number; expiresAt: number;
  players: PlayerMeta[];
  state: AnyState;
  history: { seq: number; playerId: string; segment: number; multiplier: number; round: number; dartNo: number; catchUp: boolean }[];
}
