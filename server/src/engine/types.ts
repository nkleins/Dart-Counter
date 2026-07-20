export type GameType = 'x01' | 'cricket' | 'aroundTheClock';

export interface Dart {
  segment: number;    // 0 = Miss, 1..20, 25 = Bull
  multiplier: number; // 0 = Miss, 1 = Single, 2 = Double, 3 = Triple (Bull: 1=25, 2=50)
}

/** Ein Dart mit Spielerzuordnung — die flache Wurfliste besteht daraus. */
export interface PlayerDart extends Dart {
  playerId: string;
}

export interface PlayerInput {
  id: string;
  name: string;
  order: number;
  firstTurnDarts?: number; // Erst-Zug-Länge (Default 3); >3 = Aufholen
}

export type X01InOut = 'straight' | 'double' | 'master';

export interface X01Options {
  start: number;
  in: X01InOut;
  out: X01InOut;
}

export interface CricketOptions {
  mode: 'standard' | 'cutthroat';
  bull: boolean;
}

export interface AtcOptions {
  advanceByMultiplier: boolean; // true: Double/Triple des Ziels rücken 2/3 vor
}

export type MatchFormat =
  | { kind: 'casual' }
  | { kind: 'singleSet'; legs: 3 | 5 | 7 }
  | { kind: 'match'; sets: 3 | 5 | 7; legs: 3 | 5 | 7 };

export interface MatchSummary {
  format: MatchFormat;
  legsWon: Record<string, number>;   // im aktuellen Set
  setsWon: Record<string, number>;   // nur match-Modus relevant
  legNumber: number;                 // aktuelles Leg im Set (1-basiert)
  setNumber: number;                 // aktuelles Set (1-basiert)
  legWinnerId: string | null;        // nur an einer Leg-Grenze gesetzt
  setWinnerId: string | null;        // nur an einer Set-Grenze gesetzt
  matchWinnerId: string | null;      // Gesamtsieger
  finished: boolean;                 // Match beendet
  averages: Record<string, number> | null; // 3-Dart-Ø je Person über das ganze Match (nur x01, sonst null)
}
