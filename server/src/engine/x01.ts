import type { PlayerDart, PlayerInput, X01Options } from './types.js';
import { dartPoints, isDouble, isDoubleOrTriple } from './score.js';
import { groupTurns, playerOrder, firstTurnDartsMap, publicTurnState } from './turns.js';
import { suggestCheckout } from './checkout.js';

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
  checkout: string[] | null; // Vorschlag für den aktuellen Spieler (falls Finish in Reichweite)
}

export function computeX01State(
  options: X01Options,
  players: PlayerInput[],
  darts: PlayerDart[],
): X01State {
  const order = playerOrder(players);
  const ps = new Map<string, X01PlayerState>(
    players.map((p) => [p.id, {
      playerId: p.id,
      remaining: options.start,
      dartsThrown: 0,
      opened: options.in === 'straight',
      finished: false,
    }]),
  );

  const firstTurnDarts = firstTurnDartsMap(players);
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

  const players_out = order.map((id) => ps.get(id)!);
  const pub = publicTurnState(turns, order, winnerId, lastTurnComplete, firstTurnDarts);
  const cur = pub.currentPlayerId ? ps.get(pub.currentPlayerId) : null;
  const dartsLeft = pub.dartsThisTurnTotal - pub.dartsThrownThisTurn;
  const checkout = cur && cur.opened ? suggestCheckout(cur.remaining, dartsLeft, options.out) : null;
  return { ...pub, finished: winnerId !== null, winnerId, players: players_out, checkout };
}
