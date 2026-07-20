import type { GameType, PlayerDart, PlayerInput, MatchFormat, MatchSummary } from './types.js';
import { computeGameState, type GameStateResult } from './index.js';
import type { X01State } from './x01.js';

/** Ein Leg-Abschnitt der flachen Wurfliste (für die nach Leg/Set gruppierte Verlaufsansicht). */
export interface LegSegment {
  setNumber: number;   // 1-basiert
  legInSet: number;    // Leg-Nummer innerhalb des Sets (1-basiert)
  dartCount: number;   // Anzahl Darts dieses Legs in der flachen Liste
}

/** Liest ein gültiges Format aus den Optionen; fehlt/ungültig → casual. */
function readFormat(options: unknown): MatchFormat {
  const f = (options as { format?: unknown } | null | undefined)?.format as Record<string, unknown> | undefined;
  const ok = (n: unknown): n is 3 | 5 | 7 => n === 3 || n === 5 || n === 7;
  if (f?.kind === 'singleSet' && ok(f.legs)) return { kind: 'singleSet', legs: f.legs };
  if (f?.kind === 'match' && ok(f.sets) && ok(f.legs)) return { kind: 'match', sets: f.sets, legs: f.legs };
  return { kind: 'casual' };
}

/** Spielreihenfolge um `by` rotiert (order-Werte neu vergeben, damit Position `by` startet). */
function rotatePlayers(sorted: PlayerInput[], by: number): PlayerInput[] {
  const n = sorted.length;
  if (n === 0) return sorted;
  const k = ((by % n) + n) % n;
  return sorted.map((p, i) => ({ ...p, order: ((i - k) % n + n) % n }));
}

/**
 * Kleinste Dart-Anzahl k, mit der `slice[0..k]` das Leg beendet. `finished` ist
 * monoton in k (nach dem Sieg-Dart bleibt es true), daher binäre Suche.
 * Vorbedingung: das ganze `slice` beendet das Leg bereits.
 */
function legEnd(gameType: GameType, options: unknown, rotated: PlayerInput[], slice: PlayerDart[]): number {
  let lo = 1, hi = slice.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (computeGameState(gameType, options, rotated, slice.slice(0, mid)).state.finished) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}

const legsToWin = (format: MatchFormat): number =>
  format.kind === 'casual' ? 1 : Math.ceil(format.legs / 2);
const setsToWin = (format: MatchFormat): number =>
  format.kind === 'match' ? Math.ceil(format.sets / 2) : 1;

export function computeMatchState(
  gameType: GameType,
  options: unknown,
  players: PlayerInput[],
  darts: PlayerDart[],
): { leg: GameStateResult; match: MatchSummary; segments: LegSegment[] } {
  const format = readFormat(options);
  const sorted = [...players].sort((a, b) => a.order - b.order);
  const legsWon: Record<string, number> = {};
  const setsWon: Record<string, number> = {};
  for (const p of sorted) { legsWon[p.id] = 0; setsWon[p.id] = 0; }

  // 3-Dart-Ø (nur x01): erzielte Punkte / geworfene Darts, über alle Legs summiert.
  const isX01 = gameType === 'x01';
  const x01Start = isX01 ? Number((options as { start?: unknown } | null)?.start ?? 0) : 0;
  const points: Record<string, number> = {};
  const dartsThrown: Record<string, number> = {};
  if (isX01) for (const p of sorted) { points[p.id] = 0; dartsThrown[p.id] = 0; }

  const needLegs = legsToWin(format);
  const needSets = setsToWin(format);

  let offset = 0;
  let legIndex = 0;              // globaler Leg-Zähler für die Rotation
  let matchWinnerId: string | null = null;
  let lastLegWinnerId: string | null = null;
  let lastLegWonSet = false;
  const segments: LegSegment[] = [];
  let segSet = 1;   // laufende Set-/Leg-Nummer für die Segmentierung
  let segLeg = 1;
  // Init: frisches Leg 1 (falls noch keine Würfe / nur bis zur Leg-Grenze gespielt).
  let leg: GameStateResult = computeGameState(gameType, options, rotatePlayers(sorted, 0), []);

  while (offset < darts.length && !matchWinnerId) {
    const rotated = rotatePlayers(sorted, legIndex);
    const slice = darts.slice(offset);
    const res = computeGameState(gameType, options, rotated, slice);
    // Ø-Statistik dieses Legs aufaddieren (der Engine-Zustand endet beim Sieg-Dart,
    // spiegelt also genau dieses Leg wider — genau einmal je Schleifendurchlauf).
    if (isX01) {
      for (const pl of (res.state as X01State).players) {
        points[pl.playerId]! += x01Start - pl.remaining;
        dartsThrown[pl.playerId]! += pl.dartsThrown;
      }
    }
    if (!res.state.finished) { leg = res; lastLegWinnerId = null; break; } // laufendes Leg

    const w = res.state.winnerId as string;
    const consumed = legEnd(gameType, options, rotated, slice);
    segments.push({ setNumber: segSet, legInSet: segLeg, dartCount: consumed });
    lastLegWonSet = false;
    legsWon[w]! += 1;
    lastLegWinnerId = w;
    offset += consumed;
    legIndex += 1;

    if (format.kind === 'casual') {
      matchWinnerId = w;
    } else if (legsWon[w]! >= needLegs) {
      if (format.kind === 'singleSet') {
        matchWinnerId = w;
      } else {
        setsWon[w]! += 1;
        lastLegWonSet = true;
        if (setsWon[w]! >= needSets) matchWinnerId = w;
        else for (const p of sorted) legsWon[p.id] = 0; // neues Set
      }
    }

    if (matchWinnerId) {
      // Finales Leg als Board zeigen (die Aufnahme, die entschieden hat).
      leg = computeGameState(gameType, options, rotated, darts.slice(offset - consumed));
    } else if (lastLegWonSet) {
      segSet += 1; segLeg = 1; // nächstes Set
    } else {
      segLeg += 1;             // nächstes Leg im selben Set
    }
  }

  // Zwischen zwei Legs (alle Darts verbraucht, Leg gewonnen, Match läuft): frisches
  // nächstes Leg zeigen + Banner (legWinnerId) setzen.
  if (!matchWinnerId && offset >= darts.length && lastLegWinnerId !== null) {
    leg = computeGameState(gameType, options, rotatePlayers(sorted, legIndex), []);
  }
  // Laufendes Leg (noch nicht beendet) als eigenes Segment für die Verlaufsansicht.
  if (offset < darts.length) {
    segments.push({ setNumber: segSet, legInSet: segLeg, dartCount: darts.length - offset });
  }

  const finished = matchWinnerId !== null;
  const legsInSet = Object.values(legsWon).reduce((a, b) => a + b, 0);
  const setsPlayed = Object.values(setsWon).reduce((a, b) => a + b, 0);

  let averages: Record<string, number> | null = null;
  if (isX01) {
    averages = {};
    for (const p of sorted) {
      const dc = dartsThrown[p.id]!;
      averages[p.id] = dc > 0 ? (points[p.id]! / dc) * 3 : 0;
    }
  }

  const match: MatchSummary = {
    format,
    legsWon,
    setsWon,
    legNumber: legsInSet + (finished ? 0 : 1),
    setNumber: setsPlayed + (finished && format.kind === 'match' ? 0 : 1),
    legWinnerId: finished ? null : lastLegWinnerId,
    setWinnerId: finished ? null : (lastLegWonSet ? lastLegWinnerId : null),
    matchWinnerId,
    finished,
    averages,
  };
  return { leg, match, segments };
}
