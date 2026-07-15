import type { PlayerDart, PlayerInput, X01Options } from './types.js';
import { dartPoints, isDouble, isDoubleOrTriple } from './score.js';
import { groupTurns, turnCursor, roundFor, type Turn } from './turns.js';

export interface X01PlayerState {
  playerId: string;
  remaining: number;
  dartsThrown: number;
  opened: boolean;
  finished: boolean;
}

export interface X01State {
  currentPlayerId: string | null;
  round: number;
  dartsThrownThisTurn: number;
  dartsThisTurnTotal: number;
  finished: boolean;
  winnerId: string | null;
  players: X01PlayerState[];
}

export function computeX01State(
  options: X01Options,
  players: PlayerInput[],
  darts: PlayerDart[],
): X01State {
  const order = [...players].sort((a, b) => a.order - b.order).map((p) => p.id);
  const ps = new Map<string, X01PlayerState>(
    players.map((p) => [p.id, {
      playerId: p.id,
      remaining: options.start,
      dartsThrown: 0,
      opened: options.in === 'straight',
      finished: false,
    }]),
  );

  const firstTurnDarts = new Map(players.filter((p) => p.firstTurnDarts).map((p) => [p.id, p.firstTurnDarts!]));
  const turns = groupTurns(darts, firstTurnDarts);
  let winnerId: string | null = null;
  let lastTurnComplete = true;

  for (let i = 0; i < turns.length; i++) {
    const turn = turns[i]!;
    const state = ps.get(turn.playerId);
    if (!state || winnerId) continue;

    const startRemaining = state.remaining;
    const startOpened = state.opened;
    let remaining = state.remaining;
    let opened = state.opened;
    let busted = false;
    let wonThisTurn = false;

    for (const dart of turn.darts) {
      state.dartsThrown += 1;

      if (!opened) {
        const opens = options.in === 'double' ? isDouble(dart) : isDoubleOrTriple(dart);
        if (!opens) continue; // Dart zählt nicht bis eröffnet
        opened = true;
      }

      const next = remaining - dartPoints(dart);
      if (next < 0) { busted = true; break; }
      if (next === 0) {
        const outOk =
          options.out === 'straight' ? true :
          options.out === 'double' ? isDouble(dart) :
          isDoubleOrTriple(dart); // master
        if (!outOk) { busted = true; break; }
        remaining = 0;
        wonThisTurn = true;
        break;
      }
      if (options.out === 'double' && next === 1) { busted = true; break; }
      remaining = next;
    }

    if (busted) {
      state.remaining = startRemaining;
      state.opened = startOpened || opened; // einmal eröffnet bleibt eröffnet
    } else {
      state.remaining = remaining;
      state.opened = opened;
      if (wonThisTurn) { state.finished = true; winnerId = turn.playerId; }
    }
    if (i === turns.length - 1) lastTurnComplete = busted || wonThisTurn || turn.darts.length >= turn.cap;
  }

  return assembleState(order, ps, turns, winnerId, lastTurnComplete, firstTurnDarts);
}

/**
 * Baut aus den Spielerzuständen + der Info, ob der letzte Zug abgeschlossen ist, den
 * öffentlichen X01State (aktueller Spieler, Runde, Darts im Zug). Wird von allen
 * Ausbaustufen von computeX01State genutzt und ändert sich ab hier nicht mehr — nur
 * die Replay-Schleife oben wächst in Task 4/5.
 */
function assembleState(
  order: string[],
  ps: Map<string, X01PlayerState>,
  turns: Turn[],
  winnerId: string | null,
  lastTurnComplete: boolean,
  firstTurnDarts: Map<string, number>,
): X01State {
  const players_out = order.map((id) => ps.get(id)!);
  if (winnerId) {
    return {
      currentPlayerId: null,
      round: Math.max(1, Math.ceil(turns.length / Math.max(1, order.length))),
      dartsThrownThisTurn: 0,
      dartsThisTurnTotal: 0,
      finished: true,
      winnerId,
      players: players_out,
    };
  }
  const { currentPlayerId, dartsThrownThisTurn, dartsThisTurnTotal } = turnCursor(turns, order, lastTurnComplete, firstTurnDarts);
  const round = currentPlayerId ? roundFor(turns, order, currentPlayerId, lastTurnComplete) : 1;
  return { currentPlayerId, round, dartsThrownThisTurn, dartsThisTurnTotal, finished: false, winnerId: null, players: players_out };
}
